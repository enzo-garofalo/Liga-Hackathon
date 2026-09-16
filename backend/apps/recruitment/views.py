from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.recruitment.models import Application, Process, Stage
from apps.recruitment.serializers import (
    ApplicationListSerializer,
    ProcessDetailSerializer,
    ProcessSerializer,
    StageSerializer,
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
