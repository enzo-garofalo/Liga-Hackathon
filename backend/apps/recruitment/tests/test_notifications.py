import pytest
from django.core import mail

from apps.recruitment.services.applications import approve, move_to_stage, reject
from apps.recruitment.services.notifications import (
    RECRUITMENT_NOTIFICATION_TYPES,
    _TASK_DISPATCH,
    notify,
)
from apps.teams.models import Notification, NotificationType

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def test_every_recruitment_notification_type_has_an_email_task():
    """Trava contra regressão silenciosa.

    Um tipo sem task registrada criaria a notificação e não enviaria e-mail,
    sem erro nenhum — o problema só apareceria quando um candidato reclamasse
    de não ter recebido o resultado.
    """
    declared = {
        value
        for name, value in vars(NotificationType).items()
        if name.isupper()
        and name != 'CHOICES'
        and isinstance(value, str)
        and (value.startswith('application_') or value in {
            'stage_advanced',
            'custom_communication',
        })
    }
    assert declared == RECRUITMENT_NOTIFICATION_TYPES
    for notification_type, task in _TASK_DISPATCH.items():
        assert callable(task), notification_type


def test_notify_creates_notification_and_sends_email(process):
    stage = StageFactory(process=process, order=1)
    application = ApplicationFactory(process=process, current_stage=stage)
    mail.outbox.clear()

    notify(
        application.participant,
        NotificationType.APPLICATION_CONFIRMED,
        'Inscrição confirmada.',
        link_to=f'/applications/{application.id}',
        subject_id=application.id,
    )

    assert Notification.objects.count() == 1
    assert len(mail.outbox) == 1


def test_notify_rejects_unregistered_type(process):
    application = ApplicationFactory(process=process)

    with pytest.raises(ValueError):
        notify(
            application.participant,
            NotificationType.TEAM_INVITE,
            'Tipo do hackathon não pertence ao seletivo.',
            subject_id=application.id,
        )
    assert Notification.objects.count() == 0


def test_advancing_stage_tells_the_candidate_they_advanced(process):
    """O aviso automático precisa dizer o que aconteceu, não só que houve novidade."""
    first = StageFactory(process=process, order=1, name='Inscrição')
    entrevista = StageFactory(process=process, order=2, name='Entrevista')
    application = ApplicationFactory(process=process, current_stage=first)
    mail.outbox.clear()

    move_to_stage(application, entrevista)

    notification = Notification.objects.get(type=NotificationType.STAGE_ADVANCED)
    assert 'avançou' in notification.message
    assert 'Entrevista' in notification.message
    assert len(mail.outbox) == 1
    assert 'avançou para Entrevista' in mail.outbox[0].subject
    assert 'avançou para a etapa Entrevista' in mail.outbox[0].body


def test_rejecting_tells_the_candidate_they_were_not_approved(process):
    stage = StageFactory(process=process, order=1)
    application = ApplicationFactory(process=process, current_stage=stage)
    mail.outbox.clear()

    reject(application)

    notification = Notification.objects.get(type=NotificationType.APPLICATION_REJECTED)
    # "Resultado do processo X" não diz nada a quem lê a notificação no sino.
    assert 'não seguiu adiante' in notification.message
    assert len(mail.outbox) == 1
    assert 'não seguiu para a próxima etapa' in mail.outbox[0].body


def test_approving_tells_the_candidate_they_were_approved(process):
    stage = StageFactory(process=process, order=1)
    application = ApplicationFactory(process=process, current_stage=stage)
    mail.outbox.clear()

    approve(application)

    notification = Notification.objects.get(type=NotificationType.APPLICATION_APPROVED)
    assert 'aprovado' in notification.message
    assert len(mail.outbox) == 1
    assert 'aprovado' in mail.outbox[0].subject
