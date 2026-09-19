import pytest
from django.core import mail

from apps.recruitment.services.applications import (
    apply_to_process,
    approve,
    move_to_stage,
    reject,
)
from apps.recruitment.services.communications import send_communication
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


# ── Resumo e detalhe na mesma mensagem ────────────────────────────
#
# A notificação guarda o resumo na primeira linha e o detalhe depois de uma
# linha em branco. O sino lista o resumo; o pop-up abre o texto inteiro. Sem
# isso, quem não abriu o e-mail não tinha onde ler o resto na plataforma.


def resumo(notification):
    return notification.message.split('\n')[0]


def detalhe(notification):
    return notification.message.split('\n', 1)[1].strip()


def test_stage_notification_carries_detail_below_the_summary(process):
    first = StageFactory(process=process, order=1, name='Inscrição')
    case = StageFactory(
        process=process,
        order=2,
        name='Resolução do Case',
        description='Entrega de um case prático em até 7 dias.',
        allows_file_upload=True,
    )
    application = ApplicationFactory(process=process, current_stage=first)

    move_to_stage(application, case)

    notification = Notification.objects.get(type=NotificationType.STAGE_ADVANCED)
    assert resumo(notification) == 'Você avançou para a etapa Resolução do Case.'
    corpo = detalhe(notification)
    assert 'Entrega de um case prático' in corpo
    assert 'Prazo desta etapa' in corpo
    # A etapa pede arquivo: o aviso precisa dizer isso, senão o candidato acha
    # que basta esperar.
    assert 'entrega pela plataforma' in corpo


def test_stage_deadline_in_the_notification_uses_the_league_timezone(process):
    """23:59 de Brasília não pode virar o dia seguinte (decisions.md §13)."""
    from datetime import datetime

    from django.utils import timezone

    first = StageFactory(process=process, order=1)
    # 30/09 às 23:59 em São Paulo — em UTC isto já é 01/10.
    prazo = timezone.make_aware(datetime(2026, 9, 30, 23, 59))
    case = StageFactory(process=process, order=2, name='Case', end_at=prazo)
    application = ApplicationFactory(process=process, current_stage=first)

    move_to_stage(application, case)

    notification = Notification.objects.get(type=NotificationType.STAGE_ADVANCED)
    assert '30/09' in notification.message
    assert '01/10' not in notification.message


def test_rejection_notification_explains_the_result(process):
    stage = StageFactory(process=process, order=1)
    application = ApplicationFactory(process=process, current_stage=stage)

    reject(application)

    notification = Notification.objects.get(type=NotificationType.APPLICATION_REJECTED)
    assert 'não seguiu adiante' in resumo(notification)
    assert 'vagas é limitado' in detalhe(notification)


def test_approval_notification_says_what_comes_next(process):
    stage = StageFactory(process=process, order=1)
    application = ApplicationFactory(process=process, current_stage=stage)

    approve(application)

    notification = Notification.objects.get(type=NotificationType.APPLICATION_APPROVED)
    assert 'aprovado' in resumo(notification)
    assert 'próximos passos' in detalhe(notification)


def test_confirmation_notification_names_the_first_stage(process):
    from apps.recruitment.models import ProcessStatus
    from apps.teams.tests.factories import ParticipantFactory

    StageFactory(
        process=process,
        order=1,
        name='Inscrição',
        description='Inscrição confirmada.',
    )
    process.status = ProcessStatus.PUBLISHED
    process.save(update_fields=['status'])

    apply_to_process(process, ParticipantFactory())

    notification = Notification.objects.get(type=NotificationType.APPLICATION_CONFIRMED)
    assert 'foi confirmada' in resumo(notification)
    assert 'A primeira etapa é Inscrição.' in detalhe(notification)


def test_custom_communication_notification_carries_the_whole_text(process):
    """O comunicado inteiro fica na notificação, não só o assunto.

    Antes só o assunto era guardado: quem não abriu o e-mail via "Prazo do case
    prorrogado" no sino e não tinha como ler o resto.
    """
    from apps.recruitment.models import ProcessStatus

    stage = StageFactory(process=process, order=1)
    ApplicationFactory(process=process, current_stage=stage)
    process.status = ProcessStatus.PUBLISHED
    process.save(update_fields=['status'])

    send_communication(
        process,
        audience='all',
        subject='Prazo do case prorrogado',
        message='O prazo passou para sexta.\nUse o tempo extra para revisar.',
    )

    notification = Notification.objects.get(
        type=NotificationType.CUSTOM_COMMUNICATION
    )
    assert resumo(notification) == 'Prazo do case prorrogado'
    assert 'O prazo passou para sexta.' in detalhe(notification)
    assert 'Use o tempo extra para revisar.' in detalhe(notification)


def test_notification_api_exposes_the_human_label_of_the_type(candidate_client, process):
    """O pop-up mostra "Convocação para próxima etapa", não "stage_advanced"."""
    first = StageFactory(process=process, order=1)
    second = StageFactory(process=process, order=2, name='Pitch')
    application = ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=first,
    )

    move_to_stage(application, second)

    response = candidate_client.get('/api/v1/me/notifications/')
    assert response.status_code == 200
    linha = response.data[0]
    assert linha['type'] == 'stage_advanced'
    assert linha['type_display'] == 'Convocação para próxima etapa'
