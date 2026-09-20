import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.teams.models import Participant


class ProcessStatus:
    DRAFT = 'draft'
    PUBLISHED = 'published'
    CLOSED = 'closed'
    CHOICES = [
        (DRAFT, 'Rascunho'),
        (PUBLISHED, 'Publicado'),
        (CLOSED, 'Encerrado'),
    ]


class Process(models.Model):
    """Um processo seletivo da Liga (ex.: Processo Seletivo 2026.2)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # FileField em vez de ImageField para não exigir Pillow — o banner é enviado
    # por organizadores, não por candidatos.
    banner = models.FileField(upload_to='process_banners/', blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=ProcessStatus.CHOICES,
        default=ProcessStatus.DRAFT,
    )
    registration_start = models.DateTimeField()
    registration_end = models.DateTimeField()
    published_at = models.DateTimeField(null=True, blank=True)
    highlight_message = models.CharField(max_length=255, blank=True)
    # Escala das notas. O planejamento da Liga usa 1 a 5 para evitar falsa
    # precisão do tipo "7,3". O 0 é sempre aceito, reservado para ausência de
    # entrega ou impossibilidade de avaliar.
    score_min = models.PositiveSmallIntegerField(default=1)
    score_max = models.PositiveSmallIntegerField(default=5)
    # Diferença entre avaliadores que aciona revisão de um terceiro.
    divergence_threshold = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('1.5')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Processo seletivo'
        verbose_name_plural = 'Processos seletivos'

    def __str__(self):
        return self.name

    @property
    def first_stage(self):
        return self.stages.order_by('order').first()

    @property
    def last_stage(self):
        return self.stages.order_by('-order').first()


class Stage(models.Model):
    """Etapa de um processo seletivo (ex.: Inscrição, Case, Pitch, Entrevista)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    process = models.ForeignKey(Process, on_delete=models.CASCADE, related_name='stages')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # Texto longo com o que o candidato precisa fazer nesta etapa: enunciado do
    # case, formato da entrega, regras. Fica fora da linha do tempo, atrás de um
    # botão, e o candidato só lê quando chega na etapa — ver
    # `ApplicationTimelineStageSerializer.get_instructions`.
    instructions = models.TextField(blank=True)
    # Enunciado em arquivo, para a etapa em que o texto não basta: o case vem
    # como PDF, com formatação e anexos. Segue a mesma trava de `instructions`:
    # só baixa quem já chegou na etapa.
    instructions_file = models.FileField(
        upload_to='enunciados/%Y/%m/', blank=True
    )
    order = models.PositiveSmallIntegerField()
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    # Peso da etapa na nota final, em porcentagem (ex.: 35 para 35%).
    # Zero em todas as etapas significa peso igual entre elas.
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # Correção anônima desta etapa: o organizador que não for coordenador vê
    # o código do candidato, não a pessoa. Fica na etapa, e não no processo,
    # porque só o case precisa disso: no pitch e na entrevista o avaliador está
    # olhando para a pessoa de qualquer jeito (decisions.md §29).
    anonymous_evaluation = models.BooleanField(default=False)
    accepts_late_submission = models.BooleanField(default=False)
    allows_file_upload = models.BooleanField(default=False)
    max_files = models.PositiveSmallIntegerField(null=True, blank=True)
    allowed_file_types = ArrayField(
        models.CharField(max_length=10),
        default=list,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Etapa'
        verbose_name_plural = 'Etapas'
        constraints = [
            models.UniqueConstraint(
                fields=['process', 'order'],
                name='unique_stage_order_per_process',
            ),
        ]

    def __str__(self):
        return f'{self.process.name} — {self.name}'


class EvaluationCriterion(models.Model):
    """Critério de avaliação configurado para uma etapa."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='criteria')
    name = models.CharField(max_length=255)
    order = models.PositiveSmallIntegerField(default=1)
    # Peso do critério dentro da etapa, em porcentagem (ex.: 20 para 20%).
    # Zero em todos os critérios significa peso igual entre eles.
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ['order']
        verbose_name = 'Critério de avaliação'
        verbose_name_plural = 'Critérios de avaliação'

    def __str__(self):
        return f'{self.stage.name} — {self.name}'


class ApplicationStatus:
    IN_PROGRESS = 'in_progress'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    DISCARDED = 'discarded'
    # Desistência do próprio candidato, durante o período de inscrição.
    # Separado de DISCARDED de propósito: descarte é ação do organizador, e o
    # histórico ficaria mentindo sobre quem tomou a decisão.
    WITHDRAWN = 'withdrawn'
    CHOICES = [
        (IN_PROGRESS, 'Em andamento'),
        (APPROVED, 'Aprovado'),
        (REJECTED, 'Reprovado'),
        (DISCARDED, 'Descartado'),
        (WITHDRAWN, 'Desistiu'),
    ]

    # Finalizada: o organizador não move, não avalia e não aprova, e o
    # candidato não entrega mais arquivo.
    FINISHED = {APPROVED, REJECTED, DISCARDED, WITHDRAWN}


class Application(models.Model):
    """Candidatura de um participante a um processo seletivo."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    process = models.ForeignKey(
        Process,
        on_delete=models.CASCADE,
        related_name='applications',
    )
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='applications',
    )
    current_stage = models.ForeignKey(
        Stage,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='current_applications',
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.CHOICES,
        default=ApplicationStatus.IN_PROGRESS,
    )
    # Identificador mostrado ao avaliador na correção anônima (ex.: C-0007).
    code = models.CharField(max_length=20, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['participant__full_name']
        verbose_name = 'Candidatura'
        verbose_name_plural = 'Candidaturas'
        constraints = [
            models.UniqueConstraint(
                fields=['process', 'participant'],
                name='unique_application_per_process',
            ),
        ]

    def __str__(self):
        return f'{self.participant} -> {self.process}'

    @property
    def is_finished(self):
        return self.status in ApplicationStatus.FINISHED

    def stage_average(self, stage):
        """Média desta candidatura numa etapa. Delega para services.scoring."""
        from apps.recruitment.services.scoring import stage_average

        stage_id = getattr(stage, 'pk', stage)
        return stage_average(self.pk, stage_id)

    @property
    def final_score(self):
        """Média das médias de etapa. None enquanto não houver avaliação.

        Para listas use services.scoring.final_scores(), que resolve todas as
        candidaturas numa query só.
        """
        from apps.recruitment.services.scoring import final_scores

        return final_scores([self.pk]).get(self.pk)


class Deliverable(models.Model):
    """Arquivo enviado pelo candidato em uma etapa."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='deliverables',
    )
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='deliverables')
    file = models.FileField(upload_to='deliverables/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Entregável'
        verbose_name_plural = 'Entregáveis'

    def __str__(self):
        return f'{self.application.participant} — {self.stage.name}'


class Evaluation(models.Model):
    """Nota de um avaliador para um critério de uma etapa.

    O avaliador é um User com is_staff=True — organizador não precisa ter
    Participant, que é o cadastro de candidato/participante do hackathon.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='evaluations',
    )
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='evaluations')
    criterion = models.ForeignKey(
        EvaluationCriterion,
        on_delete=models.PROTECT,
        related_name='evaluations',
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='evaluations_given',
    )
    score = models.DecimalField(max_digits=4, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['stage__order', 'criterion__order']
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        constraints = [
            models.UniqueConstraint(
                fields=['application', 'criterion', 'evaluator'],
                name='unique_evaluation_per_criterion_and_evaluator',
            ),
        ]

    def __str__(self):
        return f'{self.application.participant} — {self.criterion.name}: {self.score}'


class CommunicationType:
    AUTO = 'auto'
    MANUAL = 'manual'
    CHOICES = [
        (AUTO, 'Automática'),
        (MANUAL, 'Manual'),
    ]


class CommunicationAudience:
    ALL = 'all'
    STAGE = 'stage'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    SPECIFIC = 'specific'
    CHOICES = [
        (ALL, 'Todos os candidatos'),
        (STAGE, 'Todos de uma etapa'),
        (APPROVED, 'Apenas aprovados'),
        (REJECTED, 'Apenas reprovados'),
        (SPECIFIC, 'Candidatos específicos'),
    ]


class CommunicationStatus:
    SENT = 'sent'
    FAILED = 'failed'
    CHOICES = [
        (SENT, 'Enviada'),
        (FAILED, 'Falhou'),
    ]


class Communication(models.Model):
    """Comunicado enviado aos candidatos de um processo."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    process = models.ForeignKey(
        Process,
        on_delete=models.CASCADE,
        related_name='communications',
    )
    type = models.CharField(max_length=10, choices=CommunicationType.CHOICES)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    audience = models.CharField(max_length=20, choices=CommunicationAudience.CHOICES)
    audience_stage = models.ForeignKey(
        Stage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='communications',
    )
    recipients = models.ManyToManyField(
        Participant,
        related_name='communications',
        blank=True,
    )
    status = models.CharField(
        max_length=10,
        choices=CommunicationStatus.CHOICES,
        default=CommunicationStatus.SENT,
    )
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Comunicação'
        verbose_name_plural = 'Comunicações'

    def __str__(self):
        return f'{self.process.name} — {self.subject}'


class OrganizerProfile(models.Model):
    """Perfil do organizador. role_title é informativo — não concede permissão."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organizer_profile',
    )
    full_name = models.CharField(max_length=255, blank=True)
    role_title = models.CharField(max_length=255, blank=True)
    # Coordenador do processo: enxerga a identidade dos candidatos mesmo na
    # correção anônima e administra a distribuição de avaliadores.
    is_coordinator = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True)
    github = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']
        verbose_name = 'Perfil de organizador'
        verbose_name_plural = 'Perfis de organizador'

    def __str__(self):
        return self.full_name or self.user.get_username()


class ProcessOrganizer(models.Model):
    """Organizador que o coordenador chamou para ajudar num processo.

    Ser `is_staff` deixa a pessoa entrar na área do organizador; ser membro
    daqui é o que diz em qual processo ela trabalha. Quem não é coordenador só
    enxerga os processos em que foi posto, e dentro deles só o que lhe foi
    distribuído para corrigir (decisions.md §29).

    Não há campo de "convite aceito": quem ainda não criou a senha é quem está
    com `has_usable_password()` falso. Um campo separado diria a mesma coisa e
    poderia discordar da realidade.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    process = models.ForeignKey(
        Process, on_delete=models.CASCADE, related_name='organizers'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recruitment_memberships',
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recruitment_invites_sent',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Organizador do processo'
        verbose_name_plural = 'Organizadores do processo'
        constraints = [
            models.UniqueConstraint(
                fields=['process', 'user'],
                name='unique_organizer_per_process',
            ),
        ]

    def __str__(self):
        return f'{self.user} @ {self.process.name}'


class StageAssignment(models.Model):
    """Avaliador designado para corrigir uma candidatura numa etapa.

    O planejamento da Liga prevê dois corretores por case, distribuídos entre
    candidatos diferentes. Sem designação, a correção vira "quem pegar
    primeiro" e não há como garantir dois pareceres independentes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='assignments')
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stage_assignments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['stage__order', 'created_at']
        verbose_name = 'Designação de avaliador'
        verbose_name_plural = 'Designações de avaliador'
        constraints = [
            models.UniqueConstraint(
                fields=['stage', 'application', 'evaluator'],
                name='unique_assignment_per_stage_application_evaluator',
            ),
        ]

    def __str__(self):
        return f'{self.evaluator} -> {self.application} ({self.stage.name})'
