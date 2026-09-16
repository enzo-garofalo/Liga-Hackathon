from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.recruitment.models import Application, Process, Stage
from apps.recruitment.serializers import (
    AdminApplicationDetailSerializer,
    ApplicationListSerializer,
    BulkActionSerializer,
    EvaluationInputSerializer,
    MyApplicationDetailSerializer,
    MyApplicationListSerializer,
    ProcessDetailSerializer,
    ProcessSerializer,
    PublicProcessDetailSerializer,
    PublicProcessListSerializer,
    StageSerializer,
)
from apps.recruitment.services.applications import (
    apply_to_process,
    published_processes,
    run_bulk_action,
)
from apps.recruitment.services.evaluations import (
    evaluation_summary,
    save_evaluation,
)
from apps.recruitment.services.processes import (
    assert_process_deletable,
    assert_process_editable,
    assert_stage_deletable,
    close_process,
    publish_process,
    reorder_stages,
)
from apps.recruitment.services.scoring import final_scores


class ApplicationPagination(PageNumberPagination):
    """Paginação local do recruitment.

    Definida na view e não em DEFAULT_PAGINATION_CLASS de propósito: paginar
    globalmente mudaria o formato de resposta dos endpoints do hackathon e
    quebraria o frontend em produção.
    """

    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminProcessListCreateView(generics.ListCreateAPIView):
    serializer_class = ProcessSerializer
    permission_classes = [IsAdminUser]
    queryset = Process.objects.all()


class AdminProcessDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProcessDetailSerializer
    permission_classes = [IsAdminUser]
    queryset = Process.objects.all()
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def perform_update(self, serializer):
        assert_process_editable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        assert_process_deletable(instance)
        instance.delete()


class AdminProcessPublishView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        process = publish_process(
            process,
            registration_start=request.data.get('registration_start'),
            registration_end=request.data.get('registration_end'),
            highlight_message=request.data.get('highlight_message'),
        )
        return Response(ProcessDetailSerializer(process).data)


class AdminProcessCloseView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        process = close_process(process)
        return Response(ProcessDetailSerializer(process).data)


class AdminStageListCreateView(generics.ListCreateAPIView):
    serializer_class = StageSerializer
    permission_classes = [IsAdminUser]

    def get_process(self):
        return get_object_or_404(Process, pk=self.kwargs['pk'])

    def get_queryset(self):
        return (
            Stage.objects.filter(process=self.get_process())
            .prefetch_related('criteria')
            .order_by('order')
        )

    def perform_create(self, serializer):
        process = self.get_process()
        assert_process_editable(process)
        serializer.save(process=process)


class AdminStageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StageSerializer
    permission_classes = [IsAdminUser]
    queryset = Stage.objects.prefetch_related('criteria')
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def perform_update(self, serializer):
        assert_process_editable(serializer.instance.process)
        serializer.save()

    def perform_destroy(self, instance):
        assert_process_editable(instance.process)
        assert_stage_deletable(instance)
        instance.delete()


class AdminStageReorderView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        assert_process_editable(process)
        stages = reorder_stages(process, request.data.get('order') or [])
        return Response(StageSerializer(stages, many=True).data)


class AdminApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAdminUser]
    pagination_class = ApplicationPagination

    ORDERING_FIELDS = {
        'name': 'participant__full_name',
        '-name': '-participant__full_name',
        'updated_at': 'updated_at',
        '-updated_at': '-updated_at',
    }

    def get_process(self):
        return get_object_or_404(Process, pk=self.kwargs['pk'])

    def get_queryset(self):
        params = self.request.query_params
        queryset = (
            Application.objects.filter(process=self.get_process())
            .select_related('participant', 'participant__user', 'current_stage')
        )

        if params.get('search'):
            queryset = queryset.filter(
                participant__full_name__icontains=params['search']
            )
        if params.get('stage'):
            queryset = queryset.filter(current_stage_id=params['stage'])
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        if params.get('course'):
            queryset = queryset.filter(participant__course=params['course'])

        ordering = params.get('ordering', 'name')
        return queryset.order_by(
            self.ORDERING_FIELDS.get(ordering, 'participant__full_name')
        )

    def filter_queryset(self, queryset):
        """Ordenação por nota acontece em Python.

        A nota é a média das médias de critério — agregação sobre agregação,
        que o ORM não expressa sem SQL cru. São centenas de candidatos por
        processo, então ordenar na aplicação é aceitável e garante que o valor
        exibido é o mesmo usado para ordenar. Candidato sem nota vai para o fim.
        """
        ordering = self.request.query_params.get('ordering')
        if ordering not in ('score', '-score'):
            return queryset

        scores = final_scores(queryset.values_list('id', flat=True))
        return sorted(
            queryset,
            key=lambda application: (
                scores.get(application.id) is not None,
                scores.get(application.id) or 0,
            ),
            reverse=ordering == '-score',
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['final_scores'] = final_scores(
            Application.objects.filter(
                process=self.get_process()
            ).values_list('id', flat=True)
        )
        return context


# ── Área do candidato ─────────────────────────────────────────────


def _participant_or_404(request):
    participant = getattr(request.user, 'participant', None)
    if participant is None:
        raise Http404('Usuário autenticado não possui perfil de participante.')
    return participant


class ProcessListView(generics.ListAPIView):
    """Processos publicados, para a seção 'Processos disponíveis'."""

    serializer_class = PublicProcessListSerializer

    def get_queryset(self):
        return published_processes().prefetch_related('stages')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        participant = getattr(self.request.user, 'participant', None)
        context['applied_process_ids'] = (
            set(
                Application.objects.filter(
                    participant=participant
                ).values_list('process_id', flat=True)
            )
            if participant
            else set()
        )
        return context


class ProcessDetailView(generics.RetrieveAPIView):
    """Detalhe público. Rascunho responde 404 — não existe para o candidato."""

    serializer_class = PublicProcessDetailSerializer

    def get_queryset(self):
        return published_processes().prefetch_related('stages')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        participant = getattr(self.request.user, 'participant', None)
        context['applied_process_ids'] = (
            set(
                Application.objects.filter(
                    participant=participant
                ).values_list('process_id', flat=True)
            )
            if participant
            else set()
        )
        return context


class ProcessApplyView(APIView):
    def post(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        participant = _participant_or_404(request)
        application = apply_to_process(process, participant)
        return Response(
            MyApplicationDetailSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class MyApplicationListView(generics.ListAPIView):
    serializer_class = MyApplicationListSerializer

    def get_queryset(self):
        participant = _participant_or_404(self.request)
        return (
            Application.objects.filter(participant=participant)
            .select_related('process', 'current_stage')
            .order_by('-submitted_at')
        )


class MyApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = MyApplicationDetailSerializer

    def get_queryset(self):
        participant = _participant_or_404(self.request)
        return (
            Application.objects.filter(participant=participant)
            .select_related('process', 'current_stage')
            .prefetch_related('process__stages', 'deliverables')
        )


# ── Avaliação e fluxo entre etapas ────────────────────────────────


class AdminApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = AdminApplicationDetailSerializer
    permission_classes = [IsAdminUser]
    queryset = Application.objects.select_related(
        'participant', 'participant__user', 'current_stage', 'process'
    ).prefetch_related('deliverables', 'current_stage__criteria')


class AdminEvaluationView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        application = get_object_or_404(Application, pk=pk)
        return Response(evaluation_summary(application))

    def post(self, request, pk):
        application = get_object_or_404(
            Application.objects.select_related('process'), pk=pk
        )
        payload = EvaluationInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        stage = get_object_or_404(Stage, pk=payload.validated_data['stage'])
        save_evaluation(
            application,
            stage,
            request.user,
            payload.validated_data['scores'],
            payload.validated_data.get('notes', ''),
        )
        return Response(evaluation_summary(application), status=status.HTTP_200_OK)


class AdminBulkActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        payload = BulkActionSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        applications = list(
            Application.objects.filter(
                process=process, id__in=payload.validated_data['applications']
            ).select_related('participant', 'participant__user', 'process', 'current_stage')
        )
        if len(applications) != len(set(payload.validated_data['applications'])):
            raise Http404('Alguma das candidaturas não pertence a este processo.')

        target_stage = None
        if payload.validated_data.get('target_stage'):
            target_stage = get_object_or_404(
                Stage, pk=payload.validated_data['target_stage'], process=process
            )

        run_bulk_action(
            process,
            applications,
            payload.validated_data['action'],
            target_stage=target_stage,
        )
        return Response({'updated': len(applications)})
