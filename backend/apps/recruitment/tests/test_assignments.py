"""Designação de avaliadores e detecção de divergência."""

import pytest

from apps.recruitment.models import StageAssignment
from apps.recruitment.services.scoring import divergence, needs_third_review

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


def assignments_url(stage_id):
    return f'/api/v1/admin/stages/{stage_id}/assignments/'


def auto_url(stage_id):
    return f'/api/v1/admin/stages/{stage_id}/assignments/auto/'


def evaluations_url(application_id):
    return f'/api/v1/admin/applications/{application_id}/evaluations/'


@pytest.fixture
def stage_with_candidates(process):
    stage = StageFactory(process=process, order=1)
    EvaluationCriterionFactory(stage=stage, weight=100)
    applications = [
        ApplicationFactory(process=process, current_stage=stage) for _ in range(4)
    ]
    return stage, applications


def test_evaluator_cannot_grade_without_assignment(
    evaluator_client, process, stage_with_candidates
):
    """A designação voltou a ser trava, agora que existe tela para distribuir.

    A §19 tinha tirado a trava porque não havia como designar ninguém pela
    interface, e o avaliador ficava sem conseguir salvar nota nenhuma. Com a
    aba de distribuição, a garantia de dois pareceres independentes volta a
    valer (decisions.md §29).
    """
    stage, applications = stage_with_candidates
    criterion = stage.criteria.first()

    r = evaluator_client.post(
        evaluations_url(applications[0].id),
        {
            'stage': str(stage.id),
            'scores': [{'criterion': str(criterion.id), 'score': 4}],
        },
        format='json',
    )
    assert r.status_code == 404


def test_the_service_refuses_an_undistributed_correction(
    evaluator_user, stage_with_candidates
):
    """A mesma regra, cobrada no service.

    A view devolve 404 antes de chegar aqui, mas quem chamar o service por
    outro caminho (um command, um script) precisa esbarrar na mesma trava.
    """
    from rest_framework.exceptions import PermissionDenied

    from apps.recruitment.services.evaluations import save_evaluation

    stage, applications = stage_with_candidates
    criterion = stage.criteria.first()

    with pytest.raises(PermissionDenied):
        save_evaluation(
            applications[0],
            stage,
            evaluator_user,
            [{'criterion': str(criterion.id), 'score': 4}],
        )


def test_coordinator_grades_without_assignment(
    admin_client, process, stage_with_candidates
):
    """O coordenador também avalia direto, como qualquer organizador."""
    stage, applications = stage_with_candidates
    criterion = stage.criteria.first()

    r = admin_client.post(
        evaluations_url(applications[0].id),
        {
            'stage': str(stage.id),
            'scores': [{'criterion': str(criterion.id), 'score': 4}],
        },
        format='json',
    )
    assert r.status_code == 200


def test_auto_distribute_gives_two_evaluators_per_candidate(
    admin_client, admin_user, evaluator_user, process, stage_with_candidates
):
    stage, applications = stage_with_candidates

    r = admin_client.post(
        auto_url(stage.id),
        {
            'evaluators': [str(admin_user.id), str(evaluator_user.id)],
            'per_application': 2,
        },
        format='json',
    )
    assert r.status_code == 201
    assert r.data['created'] == 8  # 4 candidatos x 2 avaliadores

    for application in applications:
        evaluators = StageAssignment.objects.filter(
            stage=stage, application=application
        ).values_list('evaluator_id', flat=True)
        assert len(set(evaluators)) == 2


def test_auto_distribute_balances_workload(
    admin_client, admin_user, evaluator_user, process, stage_with_candidates
):
    stage, _ = stage_with_candidates
    r = admin_client.post(
        auto_url(stage.id),
        {'evaluators': [str(admin_user.id), str(evaluator_user.id)]},
        format='json',
    )
    assert set(r.data['workload'].values()) == {4}


def test_auto_distribute_requires_enough_evaluators(
    admin_client, admin_user, process, stage_with_candidates
):
    stage, _ = stage_with_candidates
    r = admin_client.post(
        auto_url(stage.id), {'evaluators': [str(admin_user.id)]}, format='json'
    )
    assert r.status_code == 400


def test_redistributing_replaces_previous_assignments(
    admin_client, admin_user, evaluator_user, process, stage_with_candidates
):
    stage, _ = stage_with_candidates
    payload = {'evaluators': [str(admin_user.id), str(evaluator_user.id)]}
    admin_client.post(auto_url(stage.id), payload, format='json')
    admin_client.post(auto_url(stage.id), payload, format='json')

    assert StageAssignment.objects.filter(stage=stage).count() == 8


def test_assignment_list_shows_workload(
    admin_client, admin_user, evaluator_user, process, stage_with_candidates
):
    stage, _ = stage_with_candidates
    admin_client.post(
        auto_url(stage.id),
        {'evaluators': [str(admin_user.id), str(evaluator_user.id)]},
        format='json',
    )

    r = admin_client.get(assignments_url(stage.id))
    assert r.status_code == 200
    assert sum(r.data['workload'].values()) == 8
    assert len(r.data['assignments']) == 8


def test_divergence_between_evaluators(process, admin_user, evaluator_user):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=admin_user,
        score=5,
    )
    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=evaluator_user,
        score=2,
    )

    assert divergence(application, stage) == pytest.approx(3.0)
    assert needs_third_review(application, stage) is True


def test_small_difference_does_not_need_third_review(
    process, admin_user, evaluator_user
):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=admin_user,
        score=4,
    )
    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=evaluator_user,
        score=3,
    )

    assert needs_third_review(application, stage) is False


def test_single_evaluator_never_needs_third_review(process, admin_user):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)
    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=admin_user,
        score=5,
    )

    assert needs_third_review(application, stage) is False


def test_summary_flags_divergence(admin_client, process, admin_user, evaluator_user):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=admin_user,
        score=5,
    )
    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=evaluator_user,
        score=1,
    )

    r = admin_client.get(evaluations_url(application.id))
    assert r.data[0]['needs_third_review'] is True
