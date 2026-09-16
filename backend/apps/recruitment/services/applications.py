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
        f'Sua inscrição no {process.name} foi confirmada.',
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
        f'Você avançou para a etapa {stage.name}.',
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
        f'Você foi aprovado no {application.process.name}!',
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
        f'Resultado do {application.process.name}.',
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


# Assunto do registro no histórico de comunicações. Descarte não aparece:
# é ação administrativa e não dispara e-mail.
def _auto_subject(action, target_stage):
    if action == MOVE_STAGE:
        return f'Convocação para {target_stage.name}'
    if action == APPROVE:
        return 'Aprovados no processo seletivo'
    return 'Resultado: não aprovados'


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
        record_auto_communication(
            process,
            _auto_subject(action, target_stage),
            'Comunicação automática disparada pela ação do organizador.',
            [app.participant for app in updated],
        )

    return updated
