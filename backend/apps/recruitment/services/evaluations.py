"""Registro e consolidação de avaliações."""

from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.recruitment.models import (
    Evaluation,
    EvaluationCriterion,
    StageAssignment,
    ProcessStatus,
)
from apps.recruitment.services.scoring import (
    evaluator_stage_scores,
    needs_third_review,
    stage_average,
)



def is_coordinator(user):
    """Coordenador do processo, para efeito de correcao anonima e designacao.

    Superusuario conta como coordenador: e quem administra a instalacao, e sem
    isso ficaria sem enxergar a identidade de candidato nenhum — nao ha tela
    para marcar `is_coordinator` ainda.
    """
    if getattr(user, 'is_superuser', False):
        return True
    profile = getattr(user, 'organizer_profile', None)
    return bool(profile and profile.is_coordinator)


def assert_can_evaluate(application, stage, evaluator):
    """Avaliador só corrige quem lhe foi designado.

    Sem isso, a distribuição entre corretores vira sugestão: qualquer
    organizador poderia avaliar qualquer candidato e não haveria como garantir
    dois pareceres independentes. O coordenador escapa da regra porque é quem
    administra a distribuição e faz a revisão de divergência.
    """
    if is_coordinator(evaluator):
        return

    assigned = StageAssignment.objects.filter(
        stage=stage, application=application, evaluator=evaluator
    ).exists()
    if not assigned:
        raise PermissionDenied(
            'Você não foi designado para avaliar este candidato nesta etapa.'
        )


@transaction.atomic
def save_evaluation(application, stage, evaluator, scores, notes=''):
    """Grava as notas de um avaliador para uma etapa.

    Upsert por (candidatura, critério, avaliador): reenviar sobrescreve a nota
    do mesmo avaliador em vez de duplicar, que é o comportamento esperado de
    quem clica "Salvar Avaliação" duas vezes.

    A observação é gravada em todas as linhas da etapa para aquele avaliador —
    na interface ela é uma só por etapa, não por critério.
    """
    assert_can_evaluate(application, stage, evaluator)

    if application.process.status == ProcessStatus.CLOSED:
        raise ValidationError('Processo encerrado não aceita novas avaliações.')
    if stage.process_id != application.process_id:
        raise ValidationError('A etapa não pertence ao processo desta candidatura.')

    scale_min = Decimal(application.process.score_min)
    scale_max = Decimal(application.process.score_max)

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
        # O 0 é sempre aceito: representa ausência de entrega ou
        # impossibilidade de avaliar, não faz parte da escala.
        if score != 0 and (score < scale_min or score > scale_max):
            raise ValidationError(
                f'A nota deve estar entre {scale_min} e {scale_max}, '
                f'ou 0 para ausência de entrega.'
            )

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
                'instance': evaluation.stage,
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
                'needs_third_review': needs_third_review(
                    application, block['instance']
                ),
            }
        )

    summary.sort(key=lambda block: block['stage']['order'])
    return summary
