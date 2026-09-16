"""Regras de candidatura."""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    Process,
    ProcessStatus,
)
from apps.recruitment.services.notifications import notify
from apps.teams.models import NotificationType


def registration_is_open(process):
    now = timezone.now()
    return (
        process.status == ProcessStatus.PUBLISHED
        and process.registration_start <= now <= process.registration_end
    )


def published_processes():
    return Process.objects.filter(status=ProcessStatus.PUBLISHED)


@transaction.atomic
def apply_to_process(process, participant):
    """Cria a candidatura e avisa o candidato por e-mail + notificação."""
    if process.status != ProcessStatus.PUBLISHED:
        raise ValidationError('Este processo não está aberto para inscrições.')

    now = timezone.now()
    if now < process.registration_start:
        raise ValidationError('As inscrições ainda não começaram.')
    if now > process.registration_end:
        raise ValidationError('As inscrições para este processo já encerraram.')

    if Application.objects.filter(process=process, participant=participant).exists():
        raise ValidationError('Você já está inscrito neste processo seletivo.')

    application = Application.objects.create(
        process=process,
        participant=participant,
        current_stage=process.first_stage,
        status=ApplicationStatus.IN_PROGRESS,
        submitted_at=now,
    )

    notify(
        participant,
        NotificationType.APPLICATION_CONFIRMED,
        f'Sua inscrição no {process.name} foi confirmada.',
        link_to=f'/applications/{application.id}',
        subject_id=application.id,
    )
    return application
