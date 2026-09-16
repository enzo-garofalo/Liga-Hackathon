"""Escala de notas configurável por processo."""

import pytest

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def scenario(process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)
    return stage, criterion, application


def url(application_id):
    return f'/api/v1/admin/applications/{application_id}/evaluations/'


def body(stage, criterion, score):
    return {
        'stage': str(stage.id),
        'scores': [{'criterion': str(criterion.id), 'score': score}],
    }


def test_default_scale_is_one_to_five(process):
    assert process.score_min == 1
    assert process.score_max == 5


def test_score_above_scale_is_rejected(admin_client, scenario):
    stage, criterion, application = scenario
    r = admin_client.post(url(application.id), body(stage, criterion, 6), format='json')
    assert r.status_code == 400
    assert '5' in str(r.data)


def test_score_inside_scale_is_accepted(admin_client, scenario):
    stage, criterion, application = scenario
    r = admin_client.post(url(application.id), body(stage, criterion, 5), format='json')
    assert r.status_code == 200


def test_zero_is_always_accepted(admin_client, scenario):
    """0 é ausência de entrega, não faz parte da escala."""
    stage, criterion, application = scenario
    r = admin_client.post(url(application.id), body(stage, criterion, 0), format='json')
    assert r.status_code == 200


def test_scale_is_configurable_per_process(admin_client, process, scenario):
    stage, criterion, application = scenario
    process.score_min = 0
    process.score_max = 10
    process.save()

    r = admin_client.post(url(application.id), body(stage, criterion, 9), format='json')
    assert r.status_code == 200


def test_negative_score_is_rejected(admin_client, scenario):
    stage, criterion, application = scenario
    r = admin_client.post(url(application.id), body(stage, criterion, -1), format='json')
    assert r.status_code == 400
