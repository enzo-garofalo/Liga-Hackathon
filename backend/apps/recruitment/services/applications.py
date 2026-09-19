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
from apps.recruitment.services.communications import record_auto_communication
from apps.recruitment.services.notifications import notify
from apps.teams.models import NotificationType


def next_application_code(process):
    """Código sequencial da candidatura no processo (C-0001, C-0002...).

    É o identificador que o avaliador vê na correção anônima.
    """
    return f'C-{Application.objects.filter(process=process).count() + 1:04d}'


def registration_is_open(process):
    now = timezone.now()
    return (
        process.status == ProcessStatus.PUBLISHED
        and process.registration_start <= now <= process.registration_end
    )


def published_processes():
    return Process.objects.filter(status=ProcessStatus.PUBLISHED)


def has_reached(application, stage):
    """Se o candidato já chegou nesta etapa.

    Uma regra só, usada pelo enunciado em texto e pelo enunciado em PDF. Nenhum
    dos dois pode ser lido antes da etapa abrir: bastaria a aba de rede do
    navegador para começar dias antes dos outros.
    """
    current = application.current_stage
    return current is not None and stage.order <= current.order


# ── Texto das notificações ────────────────────────────────────────
#
# Convenção: a primeira linha é o resumo que aparece na lista do sino; o que vem
# depois da linha em branco é o detalhe, lido no pop-up da notificação. O campo
# já é um TextField, então isto não pede coluna nova em `teams`.
#
# Sem esse detalhe, quem perdeu o e-mail ficava só com a frase curta e não tinha
# onde ler o resto dentro da plataforma.


def _deadline(value):
    """Prazo no fuso da Liga.

    O banco guarda em UTC: sem converter, um prazo às 23:59 aparece como o dia
    seguinte (decisions.md §13).
    """
    return timezone.localtime(value).strftime('%d/%m') if value else 'a definir'


def _confirmed_message(process, stage):
    partes = [f'Sua inscrição no {process.name} foi confirmada.']
    if stage:
        partes.append(f'A primeira etapa é {stage.name}.')
        if stage.description:
            partes.append(stage.description)
    partes.append(
        'Acompanhe sua candidatura pela plataforma. Cada mudança de etapa chega '
        'por e-mail e aqui nas notificações.'
    )
    return '\n\n'.join(partes)


def _stage_advanced_message(stage):
    partes = [f'Você avançou para a etapa {stage.name}.']
    if stage.description:
        partes.append(stage.description)
    partes.append(f'Prazo desta etapa: até {_deadline(stage.end_at)}.')
    partes.append(
        'Esta etapa pede uma entrega pela plataforma. Abra a etapa para ler o que '
        'é pedido e enviar o arquivo dentro do prazo.'
        if stage.allows_file_upload
        else 'Abra a etapa na plataforma para ler o que é pedido.'
    )
    return '\n\n'.join(partes)


def _approved_message(process):
    return (
        f'Você foi aprovado no {process.name}!\n\n'
        'Você agora faz parte da Liga de TI. Em breve entramos em contato com os '
        'próximos passos.'
    )


def _rejected_message(process):
    return (
        f'Sua candidatura no {process.name} não seguiu adiante.\n\n'
        'Agradecemos de verdade sua participação. O número de vagas é limitado, e '
        'isso não diz respeito ao seu potencial.\n\n'
        'Esperamos você no próximo processo seletivo.'
    )


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
        code=next_application_code(process),
        status=ApplicationStatus.IN_PROGRESS,
        submitted_at=now,
    )

    notify(
        participant,
        NotificationType.APPLICATION_CONFIRMED,
        _confirmed_message(process, application.current_stage),
        link_to=f'/applications/{application.id}',
        subject_id=application.id,
    )
    record_auto_communication(
        process,
        'Inscrição confirmada',
        'Confirmação automática de inscrição no processo seletivo.',
        [participant],
        aggregate=True,
    )
    return application


# ── Ações em massa do organizador ─────────────────────────────────

MOVE_STAGE = 'move_stage'
APPROVE = 'approve'
REJECT = 'reject'
DISCARD = 'discard'
BULK_ACTIONS = {MOVE_STAGE, APPROVE, REJECT, DISCARD}


def _assert_actionable(application):
    if application.process.status == ProcessStatus.CLOSED:
        raise ValidationError('Processo encerrado não aceita alterações.')
    if application.is_finished:
        raise ValidationError(
            f'A candidatura de {application.participant.full_name} já está '
            f'finalizada e não pode ser alterada.'
        )


def move_to_stage(application, stage):
    """Move o candidato de etapa e o convoca por e-mail."""
    _assert_actionable(application)
    if stage.process_id != application.process_id:
        raise ValidationError('A etapa não pertence a este processo.')

    application.current_stage = stage
    application.save(update_fields=['current_stage', 'updated_at'])

    notify(
        application.participant,
        NotificationType.STAGE_ADVANCED,
        _stage_advanced_message(stage),
        link_to=f'/applications/{application.id}',
        subject_id=application.id,
    )
    return application


def approve(application):
    """Aprova o candidato. Só permitido na última etapa do processo."""
    _assert_actionable(application)

    last_stage = application.process.last_stage
    if last_stage is None or application.current_stage_id != last_stage.id:
        raise ValidationError(
            'A aprovação final só é permitida para candidatos na última etapa.'
        )

    application.status = ApplicationStatus.APPROVED
    application.save(update_fields=['status', 'updated_at'])

    notify(
        application.participant,
        NotificationType.APPLICATION_APPROVED,
        _approved_message(application.process),
        link_to=f'/applications/{application.id}',
        subject_id=application.id,
    )
    return application


def reject(application):
    _assert_actionable(application)

    application.status = ApplicationStatus.REJECTED
    application.save(update_fields=['status', 'updated_at'])

    notify(
        application.participant,
        NotificationType.APPLICATION_REJECTED,
        _rejected_message(application.process),
        link_to=f'/applications/{application.id}',
        subject_id=application.id,
    )
    return application


def discard(application):
    """Descarte administrativo — duplicidade ou desistência. Não notifica."""
    _assert_actionable(application)

    application.status = ApplicationStatus.DISCARDED
    application.save(update_fields=['status', 'updated_at'])
    return application


# Assunto e texto do registro no histórico de comunicações. O texto repete o que o
# candidato recebeu por e-mail: um histórico que só diz "comunicação automática" não
# deixa o organizador conferir o que foi dito. Descarte não aparece: é ação
# administrativa e não dispara e-mail.
def _auto_message(action, target_stage):
    if action == MOVE_STAGE:
        return (
            f'Convocação para {target_stage.name}',
            f'Você avançou para a etapa {target_stage.name}. '
            'Confira o que é pedido e o prazo pela plataforma.',
        )
    if action == APPROVE:
        return (
            'Aprovados no processo seletivo',
            'Você foi aprovado no processo seletivo da Liga de TI.',
        )
    return (
        'Resultado: não aprovados',
        'Sua candidatura não seguiu adiante nesta edição. '
        'Obrigado por participar do processo seletivo.',
    )


@transaction.atomic
def run_bulk_action(process, applications, action, target_stage=None):
    """Aplica a ação a todas as candidaturas, ou a nenhuma.

    Roda em transação de propósito: uma seleção parcialmente aplicada deixaria
    o organizador sem saber quem foi movido e quem não foi.
    """
    if action not in BULK_ACTIONS:
        raise ValidationError(f'Ação desconhecida: {action}.')
    if not applications:
        raise ValidationError('Selecione ao menos uma candidatura.')

    if action == MOVE_STAGE:
        if target_stage is None:
            raise ValidationError('Informe a etapa de destino.')
        updated = [move_to_stage(app, target_stage) for app in applications]
    else:
        handler = {APPROVE: approve, REJECT: reject, DISCARD: discard}[action]
        updated = [handler(app) for app in applications]

    if action != DISCARD:
        subject, message = _auto_message(action, target_stage)
        record_auto_communication(
            process,
            subject,
            message,
            [app.participant for app in updated],
        )

    return updated
