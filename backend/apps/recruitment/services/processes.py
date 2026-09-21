"""Regras de negócio de processo seletivo e etapas."""

from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    Evaluation,
    Process,
    ProcessStatus,
)


def assert_process_editable(process):
    if process.status == ProcessStatus.CLOSED:
        raise ValidationError('Processo encerrado não pode ser alterado.')


def publish_process(process, *, registration_start=None, registration_end=None,
                    highlight_message=None):
    """draft -> published. Torna o processo visível para candidatos."""
    if process.status != ProcessStatus.DRAFT:
        raise ValidationError('Apenas processos em rascunho podem ser publicados.')
    if not process.stages.exists():
        raise ValidationError(
            'Configure ao menos uma etapa antes de abrir as inscrições.'
        )

    if registration_start is not None:
        process.registration_start = registration_start
    if registration_end is not None:
        process.registration_end = registration_end
    if highlight_message is not None:
        process.highlight_message = highlight_message

    if process.registration_end <= process.registration_start:
        raise ValidationError(
            'O fim das inscrições deve ser depois do início.'
        )

    process.status = ProcessStatus.PUBLISHED
    process.published_at = timezone.now()
    process.save()
    return process


def close_process(process):
    """Encerra o processo. Não reprova ninguém automaticamente."""
    if process.status == ProcessStatus.CLOSED:
        raise ValidationError('Este processo já está encerrado.')
    if process.status == ProcessStatus.DRAFT:
        raise ValidationError('Um rascunho não pode ser encerrado — exclua-o.')

    process.status = ProcessStatus.CLOSED
    process.save(update_fields=['status', 'updated_at'])
    return process


def assert_process_deletable(process):
    """Publicado que precisa ser cancelado deve ser encerrado, não excluído."""
    if process.status != ProcessStatus.DRAFT:
        raise ValidationError(
            'Apenas processos em rascunho podem ser excluídos. '
            'Para interromper um processo publicado, encerre-o.'
        )


def process_stats(process):
    """Contadores dos tiles da tela de gerenciamento."""
    rows = (
        Application.objects.filter(process=process)
        .values('status')
        .annotate(total=Count('id'))
    )
    counts = {row['status']: row['total'] for row in rows}
    desistiram = counts.get(ApplicationStatus.WITHDRAWN, 0)
    return {
        # Fora do total de propósito: quem cancelou a própria inscrição não é
        # inscrito, e o tile "Inscritos" contaria gente que desistiu no mesmo
        # dia. Descartado continua contando: essa pessoa se inscreveu, quem
        # tirou foi a organização.
        'total': sum(counts.values()) - desistiram,
        'in_progress': counts.get(ApplicationStatus.IN_PROGRESS, 0),
        'approved': counts.get(ApplicationStatus.APPROVED, 0),
        'rejected': counts.get(ApplicationStatus.REJECTED, 0),
        'discarded': counts.get(ApplicationStatus.DISCARDED, 0),
        'withdrawn': desistiram,
    }


def next_stage_order(process):
    last = process.stages.order_by('-order').first()
    return (last.order + 1) if last else 1


def assert_stage_deletable(stage):
    """Excluir etapa é coisa de rascunho.

    Publicado, o desenho do processo já foi mostrado a gente de fora: o
    candidato leu as etapas antes de se inscrever, e o e-mail de confirmação
    lista todas. Sumir com uma no meio do caminho muda o combinado depois do
    aceite. Editar continua liberado — é acertar o que já foi combinado, não
    trocar por outro (decisions.md §26).
    """
    if stage.process.status != ProcessStatus.DRAFT:
        raise ValidationError(
            'Este processo já foi publicado. As etapas podem ser editadas, '
            'mas não excluídas.'
        )
    if stage.current_applications.exists():
        raise ValidationError(
            'Há candidatos nesta etapa. Mova-os antes de excluí-la.'
        )
    if Evaluation.objects.filter(stage=stage).exists():
        raise ValidationError(
            'Esta etapa já tem avaliações registradas e não pode ser excluída.'
        )


def assert_criteria_removable(stage, keep_ids):
    """Critério com nota registrada não pode sumir — apagaria avaliação feita."""
    removed = stage.criteria.exclude(id__in=keep_ids)
    with_scores = Evaluation.objects.filter(criterion__in=removed).exists()
    if with_scores:
        raise ValidationError(
            'Um dos critérios removidos já possui notas registradas. '
            'Renomeie o critério em vez de removê-lo.'
        )


# Deslocamento usado na reordenação. Precisa ser maior que qualquer `order`
# real e caber em PositiveSmallIntegerField (máx. 32767).
_REORDER_OFFSET = 1000


@transaction.atomic
def reorder_stages(process, ordered_ids):
    """Reordena as etapas conforme a lista de ids recebida."""
    if Application.objects.filter(
        process=process, status=ApplicationStatus.IN_PROGRESS
    ).exists():
        raise ValidationError(
            'Não é possível reordenar etapas com candidaturas em andamento.'
        )

    stages = {str(stage.id): stage for stage in process.stages.all()}
    if set(stages) != {str(sid) for sid in ordered_ids}:
        raise ValidationError(
            'A lista deve conter exatamente as etapas deste processo.'
        )
    if len(stages) >= _REORDER_OFFSET:
        raise ValidationError('Processo com etapas demais para reordenar.')

    # Duas passadas com deslocamento: mover direto para a posição final
    # violaria a constraint unique(process, order) no meio da troca. O
    # deslocamento é positivo porque `order` é PositiveSmallIntegerField e o
    # Postgres recusa valores negativos.
    for index, stage_id in enumerate(ordered_ids, start=1):
        stage = stages[str(stage_id)]
        stage.order = index + _REORDER_OFFSET
        stage.save(update_fields=['order', 'updated_at'])

    for stage in process.stages.all():
        stage.order -= _REORDER_OFFSET
        stage.save(update_fields=['order', 'updated_at'])

    return process.stages.order_by('order')
