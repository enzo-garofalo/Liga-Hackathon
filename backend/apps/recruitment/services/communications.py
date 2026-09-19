"""Comunicados do processo seletivo.

Dois caminhos distintos:

- **Manual** — o organizador escreve e envia. Cria a Communication e dispara
  e-mail + notificação para cada destinatário.
- **Automática** — registro do que já foi disparado pelas ações em massa e
  pelas inscrições. O e-mail já saiu no momento da ação; aqui só se registra,
  para a aba de Comunicações mostrar o histórico. Reenviar seria e-mail
  duplicado para o candidato.
"""

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    Communication,
    CommunicationAudience,
    CommunicationStatus,
    CommunicationType,
    ProcessStatus,
)
from apps.recruitment.services.notifications import notify
from apps.teams.models import NotificationType, Participant


def resolve_recipients(process, audience, stage=None, recipient_ids=None):
    """Quem recebe o comunicado, conforme a opção escolhida no modal."""
    applications = Application.objects.filter(process=process)

    if audience == CommunicationAudience.ALL:
        pass
    elif audience == CommunicationAudience.STAGE:
        if stage is None:
            raise ValidationError('Informe a etapa dos destinatários.')
        applications = applications.filter(current_stage=stage)
    elif audience == CommunicationAudience.APPROVED:
        applications = applications.filter(status=ApplicationStatus.APPROVED)
    elif audience == CommunicationAudience.REJECTED:
        applications = applications.filter(status=ApplicationStatus.REJECTED)
    elif audience == CommunicationAudience.SPECIFIC:
        if not recipient_ids:
            raise ValidationError('Selecione ao menos um candidato.')
        applications = applications.filter(participant_id__in=recipient_ids)
    else:
        raise ValidationError(f'Destinatário desconhecido: {audience}.')

    return Participant.objects.filter(
        id__in=applications.values_list('participant_id', flat=True)
    ).select_related('user')


@transaction.atomic
def send_communication(
    process, *, audience, subject, message, stage=None, recipient_ids=None
):
    """Envia um comunicado manual e registra no histórico."""
    if process.status == ProcessStatus.DRAFT:
        raise ValidationError(
            'Publique o processo antes de enviar comunicados aos candidatos.'
        )

    recipients = list(resolve_recipients(process, audience, stage, recipient_ids))
    if not recipients:
        raise ValidationError('Nenhum candidato corresponde a esses destinatários.')

    communication = Communication.objects.create(
        process=process,
        type=CommunicationType.MANUAL,
        subject=subject,
        message=message,
        audience=audience,
        audience_stage=stage,
        status=CommunicationStatus.SENT,
    )
    communication.recipients.set(recipients)

    # Assunto na primeira linha, texto completo abaixo: a notificação guarda o
    # comunicado inteiro, e não só o título. Quem não abriu o e-mail lê aqui.
    corpo = f'{subject}\n\n{message}'
    for participant in recipients:
        notify(
            participant,
            NotificationType.CUSTOM_COMMUNICATION,
            corpo,
            link_to=f'/processes/{process.id}',
            subject_id=communication.id,
        )

    return communication


def record_auto_communication(process, subject, message, participants, *, aggregate=False):
    """Registra no histórico um e-mail que já foi disparado.

    `aggregate=True` junta no mesmo registro os envios repetidos do mesmo
    assunto — é o caso da confirmação de inscrição, que acontece uma vez por
    candidato mas na tela aparece como uma linha só com o total.
    """
    participants = list(participants)
    if not participants:
        return None

    if aggregate:
        communication, _ = Communication.objects.get_or_create(
            process=process,
            type=CommunicationType.AUTO,
            subject=subject,
            defaults={
                'message': message,
                'audience': CommunicationAudience.SPECIFIC,
                'status': CommunicationStatus.SENT,
            },
        )
        communication.recipients.add(*participants)
        return communication

    communication = Communication.objects.create(
        process=process,
        type=CommunicationType.AUTO,
        subject=subject,
        message=message,
        audience=CommunicationAudience.SPECIFIC,
        status=CommunicationStatus.SENT,
    )
    communication.recipients.set(participants)
    return communication
