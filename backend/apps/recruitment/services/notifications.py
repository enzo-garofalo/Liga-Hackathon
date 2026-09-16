"""Notificação + e-mail do processo seletivo.

Serviço próprio, separado do apps.teams.services.notifications de propósito:
o notify() do hackathon tem um dispatch que só conhece os tipos dele e, com um
tipo desconhecido, cria a notificação e volta **sem enviar e-mail**, apenas
logando um warning. Reaproveitá-lo aqui quebraria a regra de "nunca notificação
sem e-mail" de forma silenciosa.
"""

import logging

from django.db import transaction

from apps.recruitment import tasks
from apps.teams.models import Notification, NotificationType

logger = logging.getLogger(__name__)

# Cada tipo do seletivo precisa estar aqui. O teste
# test_every_recruitment_notification_type_has_an_email_task trava essa regra.
_TASK_DISPATCH = {
    NotificationType.APPLICATION_CONFIRMED: tasks.send_application_confirmed,
    NotificationType.STAGE_ADVANCED: tasks.send_stage_advanced,
    NotificationType.APPLICATION_APPROVED: tasks.send_application_approved,
    NotificationType.APPLICATION_REJECTED: tasks.send_application_rejected,
    NotificationType.CUSTOM_COMMUNICATION: tasks.send_custom_communication,
}

RECRUITMENT_NOTIFICATION_TYPES = frozenset(_TASK_DISPATCH)


def notify(participant, notification_type, message, *, link_to='', subject_id):
    """Cria a Notification e enfileira o e-mail correspondente.

    `subject_id` é o id do objeto que o e-mail vai renderizar — a candidatura
    na maioria dos casos, a comunicação no comunicado manual.

    A Notification entra na transação do chamador; o e-mail só é enfileirado
    após o commit, para a task não rodar antes do dado existir no banco.
    """
    if notification_type not in _TASK_DISPATCH:
        raise ValueError(
            f'Tipo de notificação sem e-mail registrado: {notification_type}. '
            'Registre a task em _TASK_DISPATCH antes de usar.'
        )

    notification = Notification.objects.create(
        participant=participant,
        type=notification_type,
        message=message,
        link_to=link_to or '',
    )

    # O comunicado manual renderiza a partir da Communication; os demais,
    # a partir da candidatura.
    subject_kwarg = (
        'communication_id'
        if notification_type == NotificationType.CUSTOM_COMMUNICATION
        else 'application_id'
    )
    kwargs = {
        'participant_id': str(participant.pk),
        subject_kwarg: str(subject_id),
    }
    task = _TASK_DISPATCH[notification_type]
    transaction.on_commit(lambda: task.delay(**kwargs))

    return notification


def notify_many(participants, notification_type, message, *, link_to='', subject_id):
    return [
        notify(
            participant,
            notification_type,
            message,
            link_to=link_to,
            subject_id=subject_id,
        )
        for participant in participants
    ]
