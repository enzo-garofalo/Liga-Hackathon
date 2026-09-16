"""Cálculo ponderado, conforme o barema do planejamento da Liga."""

import pytest

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


def test_stage_average_uses_criterion_weights(process):
    stage = StageFactory(process=process, order=1)
    heavy = EvaluationCriterionFactory(stage=stage, weight=80, order=1)
    light = EvaluationCriterionFactory(stage=stage, weight=20, order=2)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(application=application, stage=stage, criterion=heavy, score=5)
    EvaluationFactory(application=application, stage=stage, criterion=light, score=1)

    # Média simples seria 3.0; ponderada é 5*0,8 + 1*0,2 = 4,2
    assert float(application.stage_average(stage)) == pytest.approx(4.2)


def test_final_score_uses_stage_weights(process):
    case = StageFactory(process=process, order=1, weight=35)
    pitch = StageFactory(process=process, order=2, weight=30)
    interview = StageFactory(process=process, order=3, weight=35)
    application = ApplicationFactory(process=process, current_stage=interview)

    for stage, score in ((case, 5), (pitch, 1), (interview, 3)):
        criterion = EvaluationCriterionFactory(stage=stage, weight=100)
        EvaluationFactory(
            application=application, stage=stage, criterion=criterion, score=score
        )

    # Média simples seria 3.0; ponderada é 5*0,35 + 1*0,30 + 3*0,35 = 3,10
    assert float(application.final_score) == pytest.approx(3.10)


def test_zero_weights_fall_back_to_equal_weight(process):
    """Processo montado sem barema continua funcionando."""
    stage = StageFactory(process=process, order=1)
    first = EvaluationCriterionFactory(stage=stage, weight=0, order=1)
    second = EvaluationCriterionFactory(stage=stage, weight=0, order=2)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(application=application, stage=stage, criterion=first, score=5)
    EvaluationFactory(application=application, stage=stage, criterion=second, score=1)

    assert float(application.stage_average(stage)) == pytest.approx(3.0)


def test_criterion_average_still_means_across_evaluators(process, evaluator_user):
    """O peso combina critérios; entre avaliadores continua média simples."""
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(application=application, stage=stage, criterion=criterion, score=5)
    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=evaluator_user,
        score=3,
    )

    assert float(application.stage_average(stage)) == pytest.approx(4.0)


def test_weights_must_sum_to_100(admin_client, process):
    r = admin_client.post(
        f'/api/v1/admin/processes/{process.id}/stages/',
        {
            'name': 'Case',
            'criteria': [
                {'name': 'A', 'weight': 50, 'order': 1},
                {'name': 'B', 'weight': 30, 'order': 2},
            ],
        },
        format='json',
    )
    assert r.status_code == 400
    assert '100' in str(r.data)


def test_weights_summing_100_are_accepted(admin_client, process):
    r = admin_client.post(
        f'/api/v1/admin/processes/{process.id}/stages/',
        {
            'name': 'Case',
            'criteria': [
                {'name': 'A', 'weight': 70, 'order': 1},
                {'name': 'B', 'weight': 30, 'order': 2},
            ],
        },
        format='json',
    )
    assert r.status_code == 201


def test_criteria_without_weights_are_accepted(admin_client, process):
    """Barema é opcional: sem peso, todos os critérios valem igual."""
    r = admin_client.post(
        f'/api/v1/admin/processes/{process.id}/stages/',
        {'name': 'Case', 'criteria': [{'name': 'A', 'order': 1}]},
        format='json',
    )
    assert r.status_code == 201
