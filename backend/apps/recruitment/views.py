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
    ApplicationStatus,
    Communication,
    Deliverable,
    OrganizerProfile,
    Process,
    ProcessOrganizer,
    Stage,
    StageAssignment,
)
from apps.recruitment.serializers import (
    AdminApplicationDetailSerializer,
    OrganizerInviteSerializer,
    ProcessOrganizerSerializer,
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
    withdraw_from_process,
)
from apps.recruitment.services.assignments import (
    assign,
    auto_distribute,
    board,
    set_evaluators,
    unassign,
    workload,
    workload_in_process,
)
from apps.recruitment.services import organizers
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
    display_name as deliverable_display_name,
    upload as upload_deliverable,
)
from apps.recruitment.services.evaluations import (
    evaluation_summary,
    save_evaluation,
)
from apps.recruitment.services.roles import (
    IsCoordinator,
    assigned_application_ids,
    can_open_process,
    is_coordinator,
    visible_processes,
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


class CoordinatorWrites:
    """Ler é de quem participa do processo; mudar é do coordenador.

    Um avaliador precisa abrir o processo, ver as etapas e o barema para
    corrigir. Criar, editar, publicar, encerrar e apagar são decisões de quem
    conduz o processo (decisions.md §29).
    """

    permission_classes = [IsAdminUser]

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAdminUser()]
        return [IsAdminUser(), IsCoordinator()]


def _process_for_organizer(request, pk):
    """O processo, se este organizador tiver o que fazer nele.

    404 e não 403 de propósito: para quem não foi chamado, o processo dos
    outros não existe. Um 403 confirmaria que o id é de um processo de verdade.
    """
    process = get_object_or_404(Process, pk=pk)
    if not can_open_process(request.user, process):
        raise Http404('Processo fora do alcance deste organizador.')
    return process


def _applications_for_organizer(request):
    """Candidaturas que este organizador tem o que fazer com.

    Mesma regra da lista, aplicada à ficha: o avaliador abre quem lhe foi
    distribuído, e o resto não existe para ele. Vale para a ficha e para as
    notas, senão fechar a lista não adiantaria nada — bastava trocar o id na
    barra de endereços.
    """
    queryset = Application.objects.filter(
        process__in=visible_processes(request.user)
    ).select_related(
        'participant', 'participant__user', 'current_stage', 'process'
    ).prefetch_related('deliverables', 'current_stage__criteria')

    if is_coordinator(request.user):
        return queryset
    return queryset.filter(assignments__evaluator=request.user).distinct()


class ApplicationPagination(PageNumberPagination):
    """Paginação local do recruitment.

    Definida na view e não em DEFAULT_PAGINATION_CLASS de propósito: paginar
    globalmente mudaria o formato de resposta dos endpoints do hackathon e
    quebraria o frontend em produção.
    """

    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminProcessListCreateView(CoordinatorWrites, generics.ListCreateAPIView):
    serializer_class = ProcessSerializer

    def get_queryset(self):
        return visible_processes(self.request.user)


class AdminProcessDetailView(CoordinatorWrites, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProcessDetailSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return visible_processes(self.request.user)

    def perform_update(self, serializer):
        assert_process_editable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        assert_process_deletable(instance)
        instance.delete()


class AdminProcessPublishView(APIView):
    permission_classes = [IsAdminUser, IsCoordinator]

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
    permission_classes = [IsAdminUser, IsCoordinator]

    def post(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        process = close_process(process)
        return Response(ProcessDetailSerializer(process).data)


class AdminStageListCreateView(CoordinatorWrites, generics.ListCreateAPIView):
    serializer_class = StageSerializer

    def get_process(self):
        return _process_for_organizer(self.request, self.kwargs['pk'])

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


class AdminStageDetailView(CoordinatorWrites, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StageSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Stage.objects.filter(
            process__in=visible_processes(self.request.user)
        ).prefetch_related('criteria')

    def perform_update(self, serializer):
        assert_process_editable(serializer.instance.process)
        serializer.save()

    def perform_destroy(self, instance):
        assert_process_editable(instance.process)
        assert_stage_deletable(instance)
        instance.delete()


class AdminStageReorderView(APIView):
    permission_classes = [IsAdminUser, IsCoordinator]

    def patch(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        assert_process_editable(process)
        stages = reorder_stages(process, request.data.get('order') or [])
        return Response(StageSerializer(stages, many=True).data)


class AdminApplicationListView(generics.ListAPIView):
    """Candidatos do processo.

    O coordenador vê o processo inteiro. O avaliador vê a própria fila: só as
    candidaturas que lhe foram distribuídas. Sem isto a distribuição não passa
    de sugestão, e o anonimato do case cai por cruzamento, porque quem enxerga
    a lista toda enxerga quem entrou e quem saiu.
    """

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
        return _process_for_organizer(self.request, self.kwargs['pk'])

    def get_queryset(self):
        params = self.request.query_params
        process = self.get_process()
        queryset = (
            Application.objects.filter(process=process)
            .select_related('participant', 'participant__user', 'current_stage')
        )

        minha_fila = assigned_application_ids(self.request.user, process)
        if minha_fila is not None:
            queryset = queryset.filter(id__in=minha_fila)

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


def _applied_process_ids(participant):
    """Processos em que o candidato está inscrito agora.

    Quem desistiu fica de fora: a candidatura continua no banco, mas a tela
    precisa voltar a oferecer "Inscrever-se". Sem esta exclusão, cancelar era
    uma porta só de ida, porque o processo seguia marcado como já inscrito.
    """
    if participant is None:
        return set()
    return set(
        Application.objects.filter(participant=participant)
        .exclude(status=ApplicationStatus.WITHDRAWN)
        .values_list('process_id', flat=True)
    )


class ProcessListView(generics.ListAPIView):
    """Processos publicados, para a seção 'Processos disponíveis'."""

    serializer_class = PublicProcessListSerializer

    def get_queryset(self):
        return published_processes().prefetch_related('stages')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        participant = getattr(self.request.user, 'participant', None)
        context['applied_process_ids'] = _applied_process_ids(participant)
        return context


class ProcessDetailView(generics.RetrieveAPIView):
    """Detalhe público. Rascunho responde 404 — não existe para o candidato."""

    serializer_class = PublicProcessDetailSerializer

    def get_queryset(self):
        return published_processes().prefetch_related('stages')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        participant = getattr(self.request.user, 'participant', None)
        context['applied_process_ids'] = _applied_process_ids(participant)
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


class ProcessWithdrawView(APIView):
    """Cancelamento da própria inscrição, espelhando `apply/`."""

    def post(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        participant = _participant_or_404(request)
        application = withdraw_from_process(process, participant)
        return Response(MyApplicationDetailSerializer(application).data)


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

    def get_queryset(self):
        return _applications_for_organizer(self.request)


class AdminEvaluationView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        application = get_object_or_404(_applications_for_organizer(request), pk=pk)
        return Response(evaluation_summary(application))

    def post(self, request, pk):
        application = get_object_or_404(_applications_for_organizer(request), pk=pk)
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
    permission_classes = [IsAdminUser, IsCoordinator]

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
    permission_classes = [IsAdminUser, IsCoordinator]

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
    permission_classes = [IsAdminUser, IsCoordinator]
    queryset = Communication.objects.select_related(
        'process', 'audience_stage'
    ).prefetch_related('recipients')


# ── Designação de avaliadores ─────────────────────────────────────


class AdminProcessAssignmentView(APIView):
    """O quadro de distribuição do processo: candidatos por etapa.

    Uma chamada só, porque a tela é uma só. O coordenador abre e vê quem está
    em cada fase e quem corrige cada um, em vez de escolher etapa e número
    antes de ver alguém.
    """

    permission_classes = [IsAdminUser, IsCoordinator]

    def get(self, request, pk):
        process = get_object_or_404(Process, pk=pk)
        return Response(
            {
                'stages': board(process),
                'workload': {
                    str(user_id): quantas
                    for user_id, quantas in workload_in_process(process).items()
                },
            }
        )

    def post(self, request, pk):
        """Troca quem corrige uma candidatura, numa etapa ou em várias."""
        process = get_object_or_404(Process, pk=pk)
        application = get_object_or_404(
            Application, pk=request.data.get('application'), process=process
        )
        stages = list(
            Stage.objects.filter(
                process=process, id__in=request.data.get('stages') or []
            )
        )
        evaluators = list(
            User.objects.filter(id__in=request.data.get('evaluators') or [])
        )

        set_evaluators(process, application, evaluators, stages)
        return Response(
            {
                'stages': board(process),
                'workload': {
                    str(user_id): quantas
                    for user_id, quantas in workload_in_process(process).items()
                },
            }
        )


class AdminStageAssignmentView(APIView):
    """Distribuição de correções de uma etapa entre os avaliadores."""

    permission_classes = [IsAdminUser, IsCoordinator]

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
    permission_classes = [IsAdminUser, IsCoordinator]

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

        # Numa etapa anônima o nome do arquivo também é identidade: sem
        # isto o avaliador baixaria "case-pedro-xavier.pdf".
        stage = deliverable.application.current_stage
        escondido = (
            request.user.is_staff
            and not is_coordinator(request.user)
            and bool(stage and stage.anonymous_evaluation)
        )
        return FileResponse(
            deliverable.file.open('rb'),
            as_attachment=True,
            filename=deliverable_display_name(deliverable, escondido),
        )


class AdminStageInstructionsFileView(APIView):
    """Enunciado em PDF da etapa: anexar e remover, pelo organizador."""

    permission_classes = [IsAdminUser, IsCoordinator]
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


# ── Organizadores do processo ─────────────────────────────────────


class AdminProcessOrganizerView(APIView):
    """Quem ajuda neste processo. Só o coordenador vê e mexe."""

    permission_classes = [IsAdminUser, IsCoordinator]

    def get_process(self, pk):
        return get_object_or_404(Process, pk=pk)

    def _listagem(self, process):
        return Response(
            ProcessOrganizerSerializer(organizers.members(process), many=True).data
        )

    def get(self, request, pk):
        return self._listagem(self.get_process(pk))

    def post(self, request, pk):
        process = self.get_process(pk)
        payload = OrganizerInviteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        organizers.invite(
            process,
            payload.validated_data['email'],
            full_name=payload.validated_data.get('full_name', ''),
            role_title=payload.validated_data.get('role_title', ''),
            invited_by=request.user,
        )
        return self._listagem(process)


class AdminProcessOrganizerDetailView(APIView):
    permission_classes = [IsAdminUser, IsCoordinator]

    def get_alvo(self, pk, user_id):
        process = get_object_or_404(Process, pk=pk)
        return process, get_object_or_404(User, pk=user_id)

    def post(self, request, pk, user_id):
        """Reenvia o convite para quem perdeu o e-mail."""
        process, user = self.get_alvo(pk, user_id)
        organizers.resend(process, user)
        return Response({'detail': 'Convite reenviado.'})

    def delete(self, request, pk, user_id):
        process, user = self.get_alvo(pk, user_id)
        if user == request.user:
            raise ValidationError(
                'Você não pode se tirar do processo que coordena.'
            )
        organizers.remove(process, user)
        return Response(status=status.HTTP_204_NO_CONTENT)


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
