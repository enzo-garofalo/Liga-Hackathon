"""Distribuição de avaliadores entre candidatos.

O planejamento da Liga prevê dois corretores independentes por case,
distribuídos entre candidatos diferentes, e um terceiro avaliador quando as
duas notas divergem além do limiar do processo.
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    ProcessStatus,
    StageAssignment,
)

User = get_user_model()


def _assert_stage_open(stage):
    if stage.process.status == ProcessStatus.CLOSED:
        raise ValidationError('Processo encerrado não aceita nova distribuição.')


@transaction.atomic
def assign(stage, application, evaluators):
    """Designa avaliadores para uma candidatura numa etapa."""
    _assert_stage_open(stage)
    if application.process_id != stage.process_id:
        raise ValidationError('A candidatura não pertence ao processo desta etapa.')

    created = []
    for evaluator in evaluators:
        if not evaluator.is_staff:
            raise ValidationError(
                f'{evaluator.get_username()} não é organizador e não pode avaliar.'
            )
        assignment, _ = StageAssignment.objects.get_or_create(
            stage=stage, application=application, evaluator=evaluator
        )
        created.append(assignment)
    return created


@transaction.atomic
def unassign(stage, application, evaluator):
    StageAssignment.objects.filter(
        stage=stage, application=application, evaluator=evaluator
    ).delete()


@transaction.atomic
def auto_distribute(stage, evaluator_ids, per_application=2):
    """Distribui os candidatos da etapa entre os avaliadores, em rodízio.

    Cada candidatura recebe `per_application` avaliadores **distintos**, e a
    carga fica equilibrada entre os avaliadores. Redistribuir substitui a
    distribuição anterior da etapa, mas nunca apaga avaliação já registrada —
    as notas ficam no banco e voltam a valer se a pessoa for designada de novo.
    """
    _assert_stage_open(stage)

    evaluators = list(User.objects.filter(id__in=evaluator_ids, is_staff=True))
    if len(evaluators) < per_application:
        raise ValidationError(
            f'São necessários ao menos {per_application} avaliadores para '
            f'distribuir {per_application} correções por candidato.'
        )

    applications = list(
        Application.objects.filter(
            process=stage.process, status=ApplicationStatus.IN_PROGRESS
        ).order_by('created_at')
    )
    if not applications:
        raise ValidationError('Não há candidaturas em andamento nesta etapa.')

    StageAssignment.objects.filter(stage=stage).delete()

    total = len(evaluators)
    assignments = []
    for index, application in enumerate(applications):
        for slot in range(per_application):
            # O deslocamento por candidato evita que os mesmos dois
            # avaliadores fiquem sempre na mesma dupla.
            evaluator = evaluators[(index + slot) % total]
            assignments.append(
                StageAssignment(
                    stage=stage, application=application, evaluator=evaluator
                )
            )

    StageAssignment.objects.bulk_create(assignments)
    return assignments


def workload(stage):
    """Quantas correções cada avaliador tem nesta etapa."""
    rows = StageAssignment.objects.filter(stage=stage).select_related('evaluator')
    counts = {}
    for row in rows:
        key = row.evaluator.get_username()
        counts[key] = counts.get(key, 0) + 1
    return counts
