"""Cálculo das notas de avaliação.

Regra do planejamento do processo seletivo da Liga:

- nota do critério = média entre os avaliadores;
- nota da etapa   = **média ponderada** dos critérios, pelo peso de cada um
  (ex.: Pensamento crítico 20%, Estrutura e clareza 10%);
- nota final      = **média ponderada** das etapas (ex.: Case 35%, Pitch 30%,
  Entrevista 35%).

Quando nenhum peso está configurado, todos valem igual — assim um processo
montado às pressas continua funcionando sem barema.

Nada é persistido: nota gravada desatualiza quando um avaliador edita a dele.
"""

from collections import defaultdict

from django.db.models import Avg

from apps.recruitment.models import Evaluation


def _weighted_average(values_with_weights):
    """Média ponderada. Peso zero em tudo significa peso igual."""
    if not values_with_weights:
        return None

    total_weight = sum(weight for _, weight in values_with_weights)
    if total_weight == 0:
        values = [value for value, _ in values_with_weights]
        return sum(values) / len(values)

    return (
        sum(value * weight for value, weight in values_with_weights) / total_weight
    )


def _criterion_rows(application_ids):
    return (
        Evaluation.objects.filter(application_id__in=application_ids)
        .values(
            'application_id',
            'stage_id',
            'stage__weight',
            'criterion_id',
            'criterion__weight',
        )
        .annotate(criterion_average=Avg('score'))
    )


def final_scores(application_ids):
    """Mapa {application_id: nota final} usando uma query só.

    Em lote porque a tabela de candidatos exibe a média de todo mundo.
    """
    application_ids = list(application_ids)
    if not application_ids:
        return {}

    # application -> stage -> (peso da etapa, [(média do critério, peso)])
    grouped = defaultdict(lambda: defaultdict(lambda: [None, []]))
    for row in _criterion_rows(application_ids):
        block = grouped[row['application_id']][row['stage_id']]
        block[0] = float(row['stage__weight'])
        block[1].append(
            (float(row['criterion_average']), float(row['criterion__weight']))
        )

    scores = {}
    for application_id, stages in grouped.items():
        stage_values = []
        for stage_weight, criteria in stages.values():
            average = _weighted_average(criteria)
            if average is not None:
                stage_values.append((average, stage_weight))

        final = _weighted_average(stage_values)
        if final is not None:
            scores[application_id] = final
    return scores


def stage_average(application_id, stage_id):
    """Nota de uma etapa: média ponderada dos critérios. None se não avaliada."""
    rows = (
        Evaluation.objects.filter(application_id=application_id, stage_id=stage_id)
        .values('criterion_id', 'criterion__weight')
        .annotate(criterion_average=Avg('score'))
    )
    return _weighted_average(
        [
            (float(row['criterion_average']), float(row['criterion__weight']))
            for row in rows
        ]
    )


def evaluator_stage_scores(application_id, stage_id):
    """Nota que cada avaliador deu à etapa, isoladamente.

    Usado para detectar divergência entre corretores: o planejamento manda um
    terceiro revisar quando a diferença passa do limiar do processo.
    """
    rows = (
        Evaluation.objects.filter(application_id=application_id, stage_id=stage_id)
        .values('evaluator_id', 'criterion_id', 'criterion__weight')
        .annotate(score_value=Avg('score'))
    )

    by_evaluator = defaultdict(list)
    for row in rows:
        by_evaluator[row['evaluator_id']].append(
            (float(row['score_value']), float(row['criterion__weight']))
        )

    return {
        evaluator_id: _weighted_average(values)
        for evaluator_id, values in by_evaluator.items()
    }


def divergence(application, stage):
    """Diferença entre a maior e a menor nota de etapa entre avaliadores."""
    scores = [
        value
        for value in evaluator_stage_scores(application.pk, stage.pk).values()
        if value is not None
    ]
    if len(scores) < 2:
        return None
    return max(scores) - min(scores)


def needs_third_review(application, stage):
    """True quando a divergência passa do limiar configurado no processo."""
    gap = divergence(application, stage)
    if gap is None:
        return False
    return gap > float(application.process.divergence_threshold)
