from django.db import transaction
from rest_framework import serializers

from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    Communication,
    Deliverable,
    EvaluationCriterion,
    OrganizerProfile,
    Process,
    ProcessStatus,
    Stage,
)
from apps.recruitment.services.processes import (
    assert_criteria_removable,
    next_stage_order,
)


class EvaluationCriterionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = EvaluationCriterion
        fields = ['id', 'name', 'order', 'weight']


class StageSerializer(serializers.ModelSerializer):
    criteria = EvaluationCriterionSerializer(many=True, required=False)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Stage
        fields = [
            'id',
            'name',
            'description',
            'order',
            'start_at',
            'end_at',
            'weight',
            'accepts_late_submission',
            'allows_file_upload',
            'max_files',
            'allowed_file_types',
            'criteria',
            'participant_count',
        ]
        read_only_fields = ['id', 'participant_count']
        extra_kwargs = {'order': {'required': False}}

    def get_participant_count(self, stage):
        return stage.current_applications.count()

    def validate(self, attrs):
        if attrs.get('criteria') is not None:
            validate_weights(attrs['criteria'], 'dos critérios da etapa')

        start_at = attrs.get('start_at', getattr(self.instance, 'start_at', None))
        end_at = attrs.get('end_at', getattr(self.instance, 'end_at', None))
        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError(
                'A data de término da etapa deve ser depois da data de início.'
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        criteria = validated_data.pop('criteria', [])
        process = validated_data.pop('process')
        validated_data.setdefault('order', next_stage_order(process))
        stage = Stage.objects.create(process=process, **validated_data)
        for index, criterion in enumerate(criteria, start=1):
            criterion.pop('id', None)
            criterion.setdefault('order', index)
            EvaluationCriterion.objects.create(stage=stage, **criterion)
        return stage

    @transaction.atomic
    def update(self, instance, validated_data):
        criteria = validated_data.pop('criteria', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if criteria is not None:
            self._sync_criteria(instance, criteria)
        return instance

    def _sync_criteria(self, stage, criteria):
        """Atualiza os critérios enviados, cria os novos e remove os ausentes.

        Remover critério que já tem nota apagaria avaliação registrada, então
        isso é bloqueado em vez de acontecer silenciosamente.
        """
        keep_ids = [c['id'] for c in criteria if c.get('id')]
        assert_criteria_removable(stage, keep_ids)
        stage.criteria.exclude(id__in=keep_ids).delete()

        for index, criterion in enumerate(criteria, start=1):
            criterion_id = criterion.pop('id', None)
            criterion.setdefault('order', index)
            if criterion_id:
                stage.criteria.filter(id=criterion_id).update(**criterion)
            else:
                EvaluationCriterion.objects.create(stage=stage, **criterion)


class ProcessSerializer(serializers.ModelSerializer):
    """Processo para o organizador, com os contadores do dashboard."""

    application_count = serializers.SerializerMethodField()
    stage_count = serializers.SerializerMethodField()

    class Meta:
        model = Process
        fields = [
            'id',
            'name',
            'description',
            'banner',
            'status',
            'registration_start',
            'registration_end',
            'published_at',
            'highlight_message',
            'score_min',
            'score_max',
            'divergence_threshold',
            'anonymous_evaluation',
            'application_count',
            'stage_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'published_at', 'created_at', 'updated_at']

    def get_application_count(self, process):
        return process.applications.count()

    def get_stage_count(self, process):
        return process.stages.count()

    def validate(self, attrs):
        start = attrs.get(
            'registration_start', getattr(self.instance, 'registration_start', None)
        )
        end = attrs.get(
            'registration_end', getattr(self.instance, 'registration_end', None)
        )
        if start and end and end <= start:
            raise serializers.ValidationError(
                'O fim das inscrições deve ser depois do início.'
            )
        return attrs

    def create(self, validated_data):
        process = super().create(validated_data)
        # "Processo visível para candidatos? Sim" já cria publicado.
        if process.status == ProcessStatus.PUBLISHED and process.published_at is None:
            from django.utils import timezone

            process.published_at = timezone.now()
            process.save(update_fields=['published_at'])
        return process


class ProcessDetailSerializer(ProcessSerializer):
    stats = serializers.SerializerMethodField()
    stages = StageSerializer(many=True, read_only=True)

    class Meta(ProcessSerializer.Meta):
        fields = ProcessSerializer.Meta.fields + ['stats', 'stages']

    def get_stats(self, process):
        from apps.recruitment.services.processes import process_stats

        return process_stats(process)


class ApplicationListSerializer(serializers.ModelSerializer):
    """Uma linha da tabela de candidatos."""

    participant_name = serializers.CharField(source='participant.full_name')
    participant_email = serializers.EmailField(source='participant.user.email')
    course = serializers.CharField(source='participant.course')
    semester = serializers.IntegerField(source='participant.semester')
    current_stage_name = serializers.CharField(
        source='current_stage.name', default=None
    )
    final_score = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id',
            'participant',
            'participant_name',
            'participant_email',
            'course',
            'semester',
            'current_stage',
            'current_stage_name',
            'status',
            'final_score',
            'updated_at',
        ]
        read_only_fields = fields

    def to_representation(self, application):
        """Na correção anônima, o avaliador vê só o código do candidato."""
        data = super().to_representation(application)
        if hide_identity(self, application):
            return anonymize(data, application)
        return data

    def get_final_score(self, application):
        """Lido do mapa montado em uma query só pela view (evita N+1)."""
        scores = self.context.get('final_scores', {})
        score = scores.get(application.id)
        return round(float(score), 2) if score is not None else None


# ── Área do candidato ─────────────────────────────────────────────


class OpenProcessSerializer(serializers.ModelSerializer):
    """O que a landing pode mostrar a quem nem tem conta.

    Campos escolhidos a dedo em vez de reaproveitar `ProcessSerializer`: este
    endpoint e aberto, e o outro carrega escala de nota, limiar de divergencia e
    contadores que sao assunto de organizador.
    """

    registration_open = serializers.SerializerMethodField()

    class Meta:
        model = Process
        fields = ["name", "registration_start", "registration_end", "registration_open"]
        read_only_fields = fields

    def get_registration_open(self, process):
        from apps.recruitment.services.applications import registration_is_open

        return registration_is_open(process)


class PublicStageSerializer(serializers.ModelSerializer):
    """Etapa como o candidato vê: sem critérios de avaliação, que são internos."""

    class Meta:
        model = Stage
        fields = ['id', 'name', 'description', 'order', 'start_at', 'end_at']
        read_only_fields = fields


class PublicProcessListSerializer(serializers.ModelSerializer):
    short_description = serializers.SerializerMethodField()
    registration_open = serializers.SerializerMethodField()
    stage_count = serializers.IntegerField(source='stages.count', read_only=True)
    already_applied = serializers.SerializerMethodField()

    class Meta:
        model = Process
        fields = [
            'id',
            'name',
            'short_description',
            'banner',
            'registration_start',
            'registration_end',
            'registration_open',
            'stage_count',
            'already_applied',
        ]
        read_only_fields = fields

    def get_short_description(self, process):
        text = process.description or ''
        return text if len(text) <= 160 else f'{text[:157]}...'

    def get_registration_open(self, process):
        from apps.recruitment.services.applications import registration_is_open

        return registration_is_open(process)

    def get_already_applied(self, process):
        return process.id in self.context.get('applied_process_ids', set())


class PublicProcessDetailSerializer(PublicProcessListSerializer):
    stages = PublicStageSerializer(many=True, read_only=True)

    class Meta(PublicProcessListSerializer.Meta):
        fields = PublicProcessListSerializer.Meta.fields + [
            'description',
            'highlight_message',
            'stages',
        ]
        read_only_fields = fields


class MyApplicationListSerializer(serializers.ModelSerializer):
    process_name = serializers.CharField(source='process.name')
    process_id = serializers.UUIDField(source='process.id')
    current_stage_name = serializers.CharField(
        source='current_stage.name', default=None
    )
    stage_count = serializers.IntegerField(source='process.stages.count')

    class Meta:
        model = Application
        fields = [
            'id',
            'process_id',
            'process_name',
            'status',
            'current_stage',
            'current_stage_name',
            'stage_count',
            'submitted_at',
            'updated_at',
        ]
        read_only_fields = fields


class ApplicationTimelineStageSerializer(PublicStageSerializer):
    """Etapa dentro da linha do tempo da candidatura."""

    state = serializers.SerializerMethodField()
    deliverables = serializers.SerializerMethodField()

    class Meta(PublicStageSerializer.Meta):
        fields = PublicStageSerializer.Meta.fields + [
            'allows_file_upload',
            'max_files',
            'allowed_file_types',
            'state',
            'deliverables',
        ]
        read_only_fields = fields

    def get_state(self, stage):
        application = self.context['application']
        current = application.current_stage
        if current is None:
            return 'upcoming'
        if stage.order < current.order:
            return 'done'
        if stage.order == current.order:
            # Candidatura encerrada não tem etapa em andamento. Sem isto, quem
            # foi aprovado na última etapa continuava vendo "Etapa atual:
            # Entrevista", girando, como se ainda houvesse o que esperar.
            if application.status != ApplicationStatus.IN_PROGRESS:
                return 'done'
            return 'current'
        return 'upcoming'

    def get_deliverables(self, stage):
        application = self.context['application']
        return [
            {
                'id': str(deliverable.id),
                'filename': deliverable.file.name.rsplit('/', 1)[-1],
                'download_url': f'/api/v1/deliverables/{deliverable.id}/download/',
                'uploaded_at': deliverable.uploaded_at,
            }
            for deliverable in application.deliverables.all()
            if deliverable.stage_id == stage.id
        ]


class MyApplicationDetailSerializer(MyApplicationListSerializer):
    """Detalhe da candidatura.

    Não expõe nota nem observação: avaliação é interna ao organizador.
    """

    stages = serializers.SerializerMethodField()
    highlight_message = serializers.CharField(
        source='process.highlight_message', read_only=True
    )

    class Meta(MyApplicationListSerializer.Meta):
        fields = MyApplicationListSerializer.Meta.fields + [
            'stages',
            'highlight_message',
        ]
        read_only_fields = fields

    def get_stages(self, application):
        stages = application.process.stages.order_by('order')
        return ApplicationTimelineStageSerializer(
            stages,
            many=True,
            context={**self.context, 'application': application},
        ).data


# ── Avaliação (organizador) ───────────────────────────────────────


class DeliverableSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source='stage.name')
    filename = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Deliverable
        fields = [
            'id',
            'stage',
            'stage_name',
            'filename',
            'size',
            'download_url',
            'uploaded_at',
        ]
        read_only_fields = fields

    def get_filename(self, deliverable):
        import os

        return os.path.basename(deliverable.file.name)

    def get_size(self, deliverable):
        try:
            return deliverable.file.size
        except (OSError, ValueError):
            return None

    def get_download_url(self, deliverable):
        """Endpoint autenticado — nunca a URL crua do arquivo."""
        return f'/api/v1/deliverables/{deliverable.id}/download/'


class AdminApplicationDetailSerializer(serializers.ModelSerializer):
    """Ficha completa do candidato, como o modal de perfil exibe."""

    participant_name = serializers.CharField(source='participant.full_name')
    email = serializers.EmailField(source='participant.user.email')
    course = serializers.CharField(source='participant.course')
    semester = serializers.IntegerField(source='participant.semester')
    phone = serializers.CharField(source='participant.phone', default=None)
    github = serializers.CharField(source='participant.github', default=None)
    linkedin = serializers.CharField(source='participant.linkedin', default=None)
    bio = serializers.CharField(source='participant.bio', default='')
    current_stage_name = serializers.CharField(
        source='current_stage.name', default=None
    )
    deliverables = DeliverableSerializer(many=True, read_only=True)
    criteria = serializers.SerializerMethodField()
    my_scores = serializers.SerializerMethodField()
    final_score = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id',
            'participant_name',
            'email',
            'course',
            'semester',
            'phone',
            'github',
            'linkedin',
            'bio',
            'status',
            'current_stage',
            'current_stage_name',
            'deliverables',
            'criteria',
            'my_scores',
            'final_score',
            'submitted_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_criteria(self, application):
        """Critérios da etapa atual — vêm da configuração, não são fixos."""
        if application.current_stage is None:
            return []
        return [
            {'id': str(criterion.id), 'name': criterion.name, 'order': criterion.order}
            for criterion in application.current_stage.criteria.order_by('order')
        ]

    def get_my_scores(self, application):
        """Notas que o organizador autenticado já deu na etapa atual."""
        request = self.context.get('request')
        if request is None or application.current_stage is None:
            return {}
        rows = application.evaluations.filter(
            stage=application.current_stage, evaluator=request.user
        )
        return {str(row.criterion_id): float(row.score) for row in rows}

    def to_representation(self, application):
        """Na correção anônima, o avaliador vê só o código do candidato."""
        data = super().to_representation(application)
        if hide_identity(self, application):
            return anonymize(data, application)
        return data

    def get_final_score(self, application):
        score = application.final_score
        return round(float(score), 2) if score is not None else None


class EvaluationInputSerializer(serializers.Serializer):
    """Payload do botão 'Salvar Avaliação'."""

    stage = serializers.UUIDField()
    scores = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class BulkActionSerializer(serializers.Serializer):
    applications = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )
    action = serializers.CharField()
    target_stage = serializers.UUIDField(required=False, allow_null=True)


# ── Comunicações ──────────────────────────────────────────────────


class CommunicationListSerializer(serializers.ModelSerializer):
    recipient_count = serializers.SerializerMethodField()
    audience_stage_name = serializers.CharField(
        source='audience_stage.name', default=None
    )

    class Meta:
        model = Communication
        fields = [
            'id',
            'type',
            'subject',
            'audience',
            'audience_stage',
            'audience_stage_name',
            'recipient_count',
            'status',
            'sent_at',
        ]
        read_only_fields = fields

    def get_recipient_count(self, communication):
        return communication.recipients.count()


class CommunicationDetailSerializer(CommunicationListSerializer):
    recipients = serializers.SerializerMethodField()

    class Meta(CommunicationListSerializer.Meta):
        fields = CommunicationListSerializer.Meta.fields + ['message', 'recipients']
        read_only_fields = fields

    def get_recipients(self, communication):
        return [
            {'id': str(p.id), 'full_name': p.full_name}
            for p in communication.recipients.all()
        ]


class CommunicationInputSerializer(serializers.Serializer):
    """Payload do modal 'Nova comunicação'."""

    audience = serializers.CharField()
    audience_stage = serializers.UUIDField(required=False, allow_null=True)
    recipients = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=False
    )
    subject = serializers.CharField(max_length=255)
    message = serializers.CharField()


# ── Anonimato na correção ─────────────────────────────────────────


def hide_identity(serializer, application):
    """True quando este leitor não pode ver quem é o candidato.

    A correção anônima do planejamento existe para a nota não ser influenciada
    por quem escreveu. O coordenador enxerga a identidade porque é quem
    distribui as correções e revisa divergências.
    """
    from apps.recruitment.services.evaluations import is_coordinator

    if not application.process.anonymous_evaluation:
        return False

    request = serializer.context.get('request')
    if request is None:
        return False
    return not is_coordinator(request.user)


# Campos que revelam quem é o candidato. Nem todo serializer tem todos — o
# anonimizador limpa só os que existirem no payload.
IDENTITY_FIELDS = (
    'participant_name',
    'participant_email',
    'email',
    'phone',
    'github',
    'linkedin',
    'bio',
)


def anonymize(data, application):
    """Substitui a identidade pelo código da candidatura."""
    for field in IDENTITY_FIELDS:
        if field in data:
            data[field] = None
    data['participant_name'] = application.code or 'Candidato anônimo'
    return data


def validate_weights(items, label):
    """Pesos precisam somar 100 — ou serem todos zero.

    Barema com pesos somando 90 ou 110 produziria nota que não corresponde ao
    que foi comunicado aos candidatos, e o erro passaria despercebido porque a
    média ponderada continua retornando um número plausível.
    """
    weights = [float(item.get('weight') or 0) for item in items]
    if not weights or not any(weights):
        return

    total = round(sum(weights), 2)
    if total != 100:
        raise serializers.ValidationError(
            f'Os pesos {label} devem somar 100%. Soma atual: {total}%.'
        )


# ── Perfil do organizador ─────────────────────────────────────────


class OrganizerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    is_coordinator = serializers.SerializerMethodField()

    class Meta:
        model = OrganizerProfile
        fields = [
            'id',
            'email',
            'full_name',
            'role_title',
            'is_coordinator',
            'phone',
            'github',
            'linkedin',
            'updated_at',
        ]
        read_only_fields = ['id', 'email', 'is_coordinator', 'updated_at']

    def get_is_coordinator(self, profile):
        """Superusuário também é coordenador — ver decisions.md §12."""
        from apps.recruitment.services.evaluations import is_coordinator

        return is_coordinator(profile.user)
