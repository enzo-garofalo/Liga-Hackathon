import logging

from apps.teams import emails
from apps.teams.models import Notification, NotificationType

logger = logging.getLogger(__name__)


EMAIL_DISPATCH = {
    NotificationType.TEAM_INVITE: emails.send_invite_received,
    NotificationType.JOIN_REQUEST: emails.send_join_request_received,
    NotificationType.INVITE_ACCEPTED: emails.send_invite_accepted,
    NotificationType.INVITE_DECLINED: emails.send_invite_declined,
    NotificationType.JOIN_ACCEPTED: emails.send_join_accepted,
    NotificationType.JOIN_DECLINED: emails.send_join_declined,
    NotificationType.TEAM_SUBMITTED: emails.send_team_submitted,
    NotificationType.TEAM_APPROVED: emails.send_team_approved,
    NotificationType.TEAM_REJECTED: emails.send_team_rejected,
    NotificationType.TEAM_DISBANDED: emails.send_team_disbanded,
}


def notify(participant, notification_type, message, *, link_to='', **email_context):
    """Cria uma Notification para o participante e dispara o e-mail correspondente.

    A criação da Notification participa da transação chamadora — se algo
    falhar antes do commit, a notification é desfeita junto com tudo. O
    envio do e-mail é best-effort: falhas são logadas e não propagadas.
    """
    notification = Notification.objects.create(
        participant=participant,
        type=notification_type,
        message=message,
        link_to=link_to or '',
    )
    fn = EMAIL_DISPATCH.get(notification_type)
    if fn is None:
        logger.warning('No email template registered for type=%s', notification_type)
        return notification

    try:
        fn(participant=participant, **email_context)
    except Exception:
        logger.exception(
            'Falha ao enviar e-mail para notificação %s (type=%s, participant=%s)',
            notification.id,
            notification_type,
            participant.id,
        )
    return notification


def notify_many(participants, notification_type, message, *, link_to='', **email_context):
    return [
        notify(p, notification_type, message, link_to=link_to, **email_context)
        for p in participants
    ]
