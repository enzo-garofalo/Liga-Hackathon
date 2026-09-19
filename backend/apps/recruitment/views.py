import os

from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.recruitment.models import (
    Application,
    Communication,
    Deliverable,
    OrganizerProfile,
    Process,
    Stage,
    StageAssignment,
)
from apps.recruitment.serializers import (
    AdminApplicationDetailSerializer,
    ApplicationListSerializer,
    BulkActionSerializer,
    CommunicationDetailSerializer,
    CommunicationInputSerializer,
    CommunicationListSerializer,
    DeliverableSerializer,
    EvaluationInputSerializer,
    MyApplicationDetailSerializer,
    MyApplicationListSerializer,
    OrganizerProfileSerializer,
    ProcessDetailSerializer,
    ProcessSerializer,
    PublicProcessDetailSerializer,
    OpenProcessSerializer,
    PublicProcessListSerializer,
    StageSerializer,
)
from apps.recruitment.services.applications import (
    apply_to_process,
    published_processes,
    run_bulk_action,
)
from apps.recruitment.services.assignments import (
    assign,
    auto_distribute,
    unassign,
    workload,
)
from apps.recruitment.services.communications import send_communication
from apps.recruitment.services.stage_files import (
    can_download as can_download_stage_file,
)
from apps.recruitment.services.stage_files import clear_file as clear_stage_file
from apps.recruitment.services.stage_files import set_file as set_stage_file
from apps.recruitment.services.deliverables import (
    assert_owner,
    can_download,
    delete as delete_deliverable,
    upload as upload_deliverable,
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

User = get_user_model()


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


class OpenProcessView(APIView):
    """Periodo de inscricoes do processo publicado, para a landing.

    Aberto de proposito: quem le a home ainda nao tem conta. Devolve `null`
    quando nao ha processo publicado, em vez de 404, para a landing so omitir a
    linha das datas em vez de tratar erro.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        process = published_processes().order_by("registration_start").first()
        if process is None:
            return Response(None)
        return Response(OpenProcessSerializer(process).data)


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


# ── Comunicações ──────────────────────────────────────────────────


class AdminCommunicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommunicationInputSerializer
        return CommunicationListSerializer

    def get_process(self):
        return get_object_or_404(Process, pk=self.kwargs['pk'])

    def get_queryset(self):
        params = self.request.query_params
        queryset = Communication.objects.filter(
            process=self.get_process()
        ).select_related('audience_stage').prefetch_related('recipients')

        if params.get('type'):
            queryset = queryset.filter(type=params['type'])
        if params.get('stage'):
            queryset = queryset.filter(audience_stage_id=params['stage'])
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        return queryset

    def create(self, request, *args, **kwargs):
        process = self.get_process()
        payload = CommunicationInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        stage = None
        if data.get('audience_stage'):
            stage = get_object_or_404(
                Stage, pk=data['audience_stage'], process=process
            )

        communication = send_communication(
            process,
            audience=data['audience'],
            subject=data['subject'],
            message=data['message'],
            stage=stage,
            recipient_ids=data.get('recipients'),
        )
        return Response(
            CommunicationDetailSerializer(communication).data,
            status=status.HTTP_201_CREATED,
        )


class AdminCommunicationDetailView(generics.RetrieveAPIView):
    serializer_class = CommunicationDetailSerializer
    permission_classes = [IsAdminUser]
    queryset = Communication.objects.select_related(
        'process', 'audience_stage'
    ).prefetch_related('recipients')


# ── Designação de avaliadores ─────────────────────────────────────


class AdminStageAssignmentView(APIView):
    """Distribuição de correções de uma etapa entre os avaliadores."""

    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        stage = get_object_or_404(Stage, pk=pk)
        rows = StageAssignment.objects.filter(stage=stage).select_related(
            'application', 'application__participant', 'evaluator'
        )
        return Response(
            {
                'workload': workload(stage),
                'assignments': [
                    {
                        'application': str(row.application_id),
                        'code': row.application.code,
                        'evaluator': row.evaluator.get_username(),
                    }
                    for row in rows
                ],
            }
        )

    def post(self, request, pk):
        """Designa avaliadores para uma candidatura específica."""
        stage = get_object_or_404(Stage, pk=pk)
        application = get_object_or_404(
            Application, pk=request.data.get('application')
        )
        evaluators = User.objects.filter(id__in=request.data.get('evaluators') or [])
        assign(stage, application, list(evaluators))
        return Response({'assigned': len(evaluators)}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        stage = get_object_or_404(Stage, pk=pk)
        application = get_object_or_404(
            Application, pk=request.data.get('application')
        )
        evaluator = get_object_or_404(User, pk=request.data.get('evaluator'))
        unassign(stage, application, evaluator)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminStageAutoDistributeView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        stage = get_object_or_404(Stage, pk=pk)
        assignments = auto_distribute(
            stage,
            request.data.get('evaluators') or [],
            int(request.data.get('per_application') or 2),
        )
        return Response(
            {'created': len(assignments), 'workload': workload(stage)},
            status=status.HTTP_201_CREATED,
        )


# ── Entregáveis ───────────────────────────────────────────────────


class MyDeliverableView(APIView):
    """Upload e remoção de entregáveis pelo candidato."""

    parser_classes = [MultiPartParser, FormParser]

    def get_application(self, request, pk):
        application = get_object_or_404(
            Application.objects.select_related('process', 'current_stage'), pk=pk
        )
        assert_owner(application, _participant_or_404(request))
        return application

    def post(self, request, pk):
        application = self.get_application(request, pk)
        uploaded = request.FILES.get('file')
        if uploaded is None:
            raise ValidationError('Envie um arquivo no campo "file".')

        stage = application.current_stage
        if stage is None:
            raise ValidationError('Sua candidatura ainda não está em uma etapa.')

        deliverable = upload_deliverable(application, stage, uploaded)
        return Response(
            DeliverableSerializer(deliverable, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyDeliverableDetailView(APIView):
    def delete(self, request, pk, deliverable_id):
        application = get_object_or_404(Application, pk=pk)
        assert_owner(application, _participant_or_404(request))
        deliverable = get_object_or_404(
            Deliverable.objects.select_related('stage'),
            pk=deliverable_id,
            application=application,
        )
        delete_deliverable(deliverable)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeliverableDownloadView(APIView):
    """Download autenticado.

    Os arquivos não são servidos por URL pública: são material de candidatura,
    o caminho seria adivinhável e o conteúdo é o trabalho do candidato.
    """

    def get(self, request, pk):
        deliverable = get_object_or_404(
            Deliverable.objects.select_related('application', 'stage'), pk=pk
        )
        if not can_download(deliverable, request.user):
            raise PermissionDenied('Você não tem acesso a este arquivo.')

        return FileResponse(
            deliverable.file.open('rb'),
            as_attachment=True,
            filename=os.path.basename(deliverable.file.name),
        )


class AdminStageInstructionsFileView(APIView):
    """Enunciado em PDF da etapa: anexar e remover, pelo organizador."""

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        stage = get_object_or_404(Stage.objects.select_related('process'), pk=pk)
        uploaded = request.FILES.get('file')
        if uploaded is None:
            raise ValidationError('Envie um arquivo no campo "file".')

        set_stage_file(stage, uploaded)
        return Response(StageSerializer(stage).data)

    def delete(self, request, pk):
        stage = get_object_or_404(Stage.objects.select_related('process'), pk=pk)
        clear_stage_file(stage)
        return Response(StageSerializer(stage).data)


class StageInstructionsFileDownloadView(APIView):
    """Download do enunciado, autenticado e preso à etapa.

    Mesma razão do entregável: o arquivo não fica em URL pública. Aqui pesa
    mais, porque o conteúdo é a prova e o ganho de quem passasse na frente
    seriam dias de vantagem.
    """

    def get(self, request, pk):
        stage = get_object_or_404(Stage.objects.select_related('process'), pk=pk)
        if not stage.instructions_file:
            raise NotFound('Esta etapa não tem enunciado anexado.')
        if not can_download_stage_file(stage, request.user):
            raise PermissionDenied(
                'O enunciado desta etapa abre quando você chegar nela.'
            )

        return FileResponse(
            stage.instructions_file.open('rb'),
            as_attachment=True,
            filename=os.path.basename(stage.instructions_file.name),
        )


class AdminOrganizerProfileView(generics.RetrieveUpdateAPIView):
    """Perfil do organizador autenticado.

    Cria o perfil na primeira visita: nem todo `is_staff` tem um — o
    superusuário criado pelo entrypoint, por exemplo, nunca passou por aqui.
    """

    serializer_class = OrganizerProfileSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        profile, _ = OrganizerProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'full_name': self.request.user.get_username()},
        )
        return profile
