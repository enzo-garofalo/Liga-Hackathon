import logging

from django.db import transaction

from apps.teams import tasks
from apps.teams.models import Notification, NotificationType

logger = logging.getLogger(__name__)

# Maps each notification type to its Celery task and a function that extracts
# JSON-serializable kwargs from the email_context dict (which holds model instances).
_TASK_DISPATCH: dict[NotificationType, tuple] = {
    NotificationType.TEAM_INVITE: (
        tasks.send_invite_received,
        lambda pid, ctx: {'participant_id': pid, 'invite_id': ctx['invite'].pk},
    ),
    NotificationType.JOIN_REQUEST: (
        tasks.send_join_request_received,
        lambda pid, ctx: {'participant_id': pid, 'join_request_id': ctx['join_request'].pk},
    ),
    NotificationType.INVITE_ACCEPTED: (
        tasks.send_invite_accepted,
        lambda pid, ctx: {'participant_id': pid, 'invite_id': ctx['invite'].pk},
    ),
    NotificationType.INVITE_DECLINED: (
        tasks.send_invite_declined,
        lambda pid, ctx: {'participant_id': pid, 'invite_id': ctx['invite'].pk},
    ),
    NotificationType.JOIN_ACCEPTED: (
        tasks.send_join_accepted,
        lambda pid, ctx: {'participant_id': pid, 'join_request_id': ctx['join_request'].pk},
    ),
    NotificationType.JOIN_DECLINED: (
        tasks.send_join_declined,
        lambda pid, ctx: {'participant_id': pid, 'join_request_id': ctx['join_request'].pk},
    ),
    NotificationType.TEAM_SUBMITTED: (
        tasks.send_team_submitted,
        lambda pid, ctx: {'participant_id': pid, 'team_id': ctx['team'].pk},
    ),
    NotificationType.TEAM_APPROVED: (
        tasks.send_team_approved,
        lambda pid, ctx: {'participant_id': pid, 'team_id': ctx['team'].pk},
    ),
    NotificationType.TEAM_REJECTED: (
        tasks.send_team_rejected,
        lambda pid, ctx: {'participant_id': pid, 'team_id': ctx['team'].pk},
    ),
    NotificationType.TEAM_DISBANDED: (
        tasks.send_team_disbanded,
        lambda pid, ctx: {'participant_id': pid, 'team_id': ctx['team'].pk},
    ),
}


def notify(participant, notification_type, message, *, link_to='', **email_context):
    """Cria uma Notification e enfileira o e-mail correspondente via Celery.

    A Notification participa da transação chamadora. O .delay() só é
    enfileirado no Redis após o commit, evitando a race condition onde a
    task roda antes do dado estar visível no banco.
    """
    notification = Notification.objects.create(
        participant=participant,
        type=notification_type,
        message=message,
        link_to=link_to or '',
    )

    entry = _TASK_DISPATCH.get(notification_type)
    if entry is None:
        logger.warning(
            'No email task registered for notification_type=%s — e-mail not sent',
            notification_type,
        )
        return notification

    task_fn, extract_kwargs = entry
    kwargs = extract_kwargs(participant.pk, email_context)

    transaction.on_commit(lambda: task_fn.delay(**kwargs))

    return notification


def notify_many(participants, notification_type, message, *, link_to='', **email_context):
    return [
        notify(p, notification_type, message, link_to=link_to, **email_context)
        for p in participants
    ]
