import uuid

from django.conf import settings
from django.db import models


class Participant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='participant',
    )
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    github = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    course = models.CharField(max_length=255)
    semester = models.PositiveSmallIntegerField()
    bio = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name

    @property
    def has_team(self):
        return TeamMembership.objects.filter(participant=self).exists()


class Team(models.Model):
    STATUS_FORMING = 'forming'
    STATUS_SUBMITTED = 'submitted'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_FORMING, 'Em formação'),
        (STATUS_SUBMITTED, 'Submetida'),
        (STATUS_APPROVED, 'Aprovada'),
        (STATUS_REJECTED, 'Recusada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    leader = models.ForeignKey(
        Participant,
        on_delete=models.PROTECT,
        related_name='led_teams',
    )
    is_open = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_FORMING)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(
                fields=['team', 'participant'],
                name='unique_team_participant',
            ),
            models.UniqueConstraint(
                fields=['participant'],
                name='unique_active_membership',
            ),
        ]

    def __str__(self):
        return f'{self.participant} -> {self.team}'


class InviteStatus:
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    DECLINED = 'declined'
    CHOICES = [
        (PENDING, 'Pendente'),
        (ACCEPTED, 'Aceito'),
        (DECLINED, 'Recusado'),
    ]


class TeamInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='invites')
    invitee = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='invites_received',
    )
    invited_by = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='invites_sent',
    )
    status = models.CharField(
        max_length=20,
        choices=InviteStatus.CHOICES,
        default=InviteStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Invite {self.team} -> {self.invitee} ({self.status})'


class JoinRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='join_requests')
    requester = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='join_requests',
    )
    status = models.CharField(
        max_length=20,
        choices=InviteStatus.CHOICES,
        default=InviteStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'JoinRequest {self.requester} -> {self.team} ({self.status})'


class NotificationType:
    TEAM_INVITE = 'team_invite'
    JOIN_REQUEST = 'join_request'
    INVITE_ACCEPTED = 'invite_accepted'
    INVITE_DECLINED = 'invite_declined'
    JOIN_ACCEPTED = 'join_accepted'
    JOIN_DECLINED = 'join_declined'
    TEAM_SUBMITTED = 'team_submitted'
    TEAM_APPROVED = 'team_approved'
    TEAM_REJECTED = 'team_rejected'
    TEAM_DISBANDED = 'team_disbanded'
    APPLICATION_CONFIRMED = 'application_confirmed'
    STAGE_ADVANCED = 'stage_advanced'
    APPLICATION_APPROVED = 'application_approved'
    APPLICATION_REJECTED = 'application_rejected'
    CUSTOM_COMMUNICATION = 'custom_communication'
    CHOICES = [
        (TEAM_INVITE, 'Convite para equipe'),
        (JOIN_REQUEST, 'Pedido de entrada'),
        (INVITE_ACCEPTED, 'Convite aceito'),
        (INVITE_DECLINED, 'Convite recusado'),
        (JOIN_ACCEPTED, 'Pedido aceito'),
        (JOIN_DECLINED, 'Pedido recusado'),
        (TEAM_SUBMITTED, 'Equipe submetida'),
        (TEAM_APPROVED, 'Equipe aprovada'),
        (TEAM_REJECTED, 'Equipe recusada'),
        (TEAM_DISBANDED, 'Equipe descartada'),
        (APPLICATION_CONFIRMED, 'Inscrição confirmada'),
        (STAGE_ADVANCED, 'Convocação para próxima etapa'),
        (APPLICATION_APPROVED, 'Aprovado no processo seletivo'),
        (APPLICATION_REJECTED, 'Não aprovado no processo seletivo'),
        (CUSTOM_COMMUNICATION, 'Comunicado do processo seletivo'),
    ]


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=30, choices=NotificationType.CHOICES)
    message = models.TextField()
    read = models.BooleanField(default=False)
    link_to = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} -> {self.participant}'


class HackathonInfo(models.Model):
    content = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Informações do hackathon'
        verbose_name_plural = 'Informações do hackathon'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Informações do hackathon'
