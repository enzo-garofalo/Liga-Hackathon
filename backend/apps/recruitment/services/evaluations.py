"""Registro e consolidação de avaliações."""

from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.recruitment.models import (
    Evaluation,
    EvaluationCriterion,
    ProcessStatus,
)
from apps.recruitment.services.scoring import stage_average

MIN_SCORE = Decimal('0')
MAX_SCORE = Decimal('10')


@transaction.atomic
def save_evaluation(application, stage, evaluator, scores, notes=''):
    """Grava as notas de um avaliador para uma etapa.

    Upsert por (candidatura, critério, avaliador): reenviar sobrescreve a nota
    do mesmo avaliador em vez de duplicar, que é o comportamento esperado de
    quem clica "Salvar Avaliação" duas vezes.

    A observação é gravada em todas as linhas da etapa para aquele avaliador —
    na interface ela é uma só por etapa, não por critério.
    """
    if application.process.status == ProcessStatus.CLOSED:
        raise ValidationError('Processo encerrado não aceita novas avaliações.')
    if stage.process_id != application.process_id:
        raise ValidationError('A etapa não pertence ao processo desta candidatura.')

    valid_criteria = {
        str(criterion.id): criterion
        for criterion in EvaluationCriterion.objects.filter(stage=stage)
    }

    saved = []
    for entry in scores:
        criterion_id = str(entry.get('criterion'))
        criterion = valid_criteria.get(criterion_id)
        if criterion is None:
            raise ValidationError(
                'Um dos critérios enviados não pertence a esta etapa.'
            )

        score = Decimal(str(entry.get('score')))
        if score < MIN_SCORE or score > MAX_SCORE:
            raise ValidationError('A nota deve estar entre 0 e 10.')

        evaluation, _ = Evaluation.objects.update_or_create(
            application=application,
            criterion=criterion,
            evaluator=evaluator,
            defaults={'stage': stage, 'score': score, 'notes': notes or ''},
        )
        saved.append(evaluation)

    return saved


def evaluation_summary(application):
    """Avaliação consolidada por etapa, como o modal de nota detalhada exibe."""
    evaluations = (
        Evaluation.objects.filter(application=application)
        .select_related('stage', 'criterion', 'evaluator')
        .order_by('stage__order', 'criterion__order')
    )

    stages = {}
    for evaluation in evaluations:
        stage_block = stages.setdefault(
            evaluation.stage_id,
            {
                'stage': {
                    'id': str(evaluation.stage_id),
                    'name': evaluation.stage.name,
                    'order': evaluation.stage.order,
                },
                'criteria': {},
                'notes': {},
            },
        )

        criterion_block = stage_block['criteria'].setdefault(
            evaluation.criterion_id,
            {'name': evaluation.criterion.name, 'scores': []},
        )
        criterion_block['scores'].append(
            {
                'evaluator': evaluation.evaluator.get_username(),
                'score': float(evaluation.score),
            }
        )

        if evaluation.notes:
            stage_block['notes'][evaluation.evaluator_id] = {
                'evaluator': evaluation.evaluator.get_username(),
                'text': evaluation.notes,
            }

    summary = []
    for stage_id, block in stages.items():
        criteria = []
        for criterion in block['criteria'].values():
            values = [entry['score'] for entry in criterion['scores']]
            criteria.append(
                {
                    'name': criterion['name'],
                    'scores': criterion['scores'],
                    'average': round(sum(values) / len(values), 2),
                }
            )

        average = stage_average(application.pk, stage_id)
        summary.append(
            {
                'stage': block['stage'],
                'criteria': criteria,
                'notes': list(block['notes'].values()),
                'stage_average': round(float(average), 2) if average else None,
            }
        )

    summary.sort(key=lambda block: block['stage']['order'])
    return summary
