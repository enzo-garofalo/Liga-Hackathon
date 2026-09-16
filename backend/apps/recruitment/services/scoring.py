"""Cálculo das médias de avaliação.

Regra (specs/v3/models.md): a média de uma etapa é a média das médias de cada
critério, e a nota final é a média das médias de etapa. Critério sem nenhuma
nota é ignorado.

Tudo é calculado na hora, nunca persistido — nota gravada desatualiza quando um
avaliador edita a dele depois.
"""

from collections import defaultdict

from django.db.models import Avg

from apps.recruitment.models import Evaluation


def final_scores(application_ids):
    """Mapa {application_id: nota final} usando uma query só.

    Em lote porque a tabela de candidatos exibe a média de todo mundo: calcular
    por candidato geraria uma query por etapa por candidato.
    """
    application_ids = list(application_ids)
    if not application_ids:
        return {}

    rows = (
        Evaluation.objects.filter(application_id__in=application_ids)
        .values('application_id', 'stage_id', 'criterion_id')
        .annotate(criterion_average=Avg('score'))
    )

    # application -> stage -> [média de cada critério]
    by_stage = defaultdict(lambda: defaultdict(list))
    for row in rows:
        by_stage[row['application_id']][row['stage_id']].append(
            row['criterion_average']
        )

    scores = {}
    for application_id, stages in by_stage.items():
        stage_averages = [
            sum(criteria) / len(criteria) for criteria in stages.values()
        ]
        scores[application_id] = sum(stage_averages) / len(stage_averages)
    return scores


def stage_average(application_id, stage_id):
    """Média de uma etapa específica. None se ainda não há avaliação nela."""
    rows = (
        Evaluation.objects.filter(application_id=application_id, stage_id=stage_id)
        .values('criterion_id')
        .annotate(criterion_average=Avg('score'))
        .values_list('criterion_average', flat=True)
    )
    averages = list(rows)
    if not averages:
        return None
    return sum(averages) / len(averages)
