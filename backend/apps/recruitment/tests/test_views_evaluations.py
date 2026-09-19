import pytest

from apps.recruitment.models import Evaluation, ProcessStatus

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


def url(application_id):
    return f'/api/v1/admin/applications/{application_id}/evaluations/'


@pytest.fixture
def scenario(process):
    stage = StageFactory(process=process, order=1, name='Case')
    first = EvaluationCriterionFactory(stage=stage, name='Pensamento crítico', order=1)
    second = EvaluationCriterionFactory(stage=stage, name='Criatividade', order=2)
    application = ApplicationFactory(process=process, current_stage=stage)
    return {
        'stage': stage,
        'first': first,
        'second': second,
        'application': application,
    }


def payload(scenario, first_score=5, second_score=3, notes='Boa entrega.'):
    return {
        'stage': str(scenario['stage'].id),
        'scores': [
            {'criterion': str(scenario['first'].id), 'score': first_score},
            {'criterion': str(scenario['second'].id), 'score': second_score},
        ],
        'notes': notes,
    }


def test_save_evaluation_creates_scores_for_each_criterion(admin_client, scenario):
    r = admin_client.post(
        url(scenario['application'].id), payload(scenario), format='json'
    )
    assert r.status_code == 200
    assert Evaluation.objects.count() == 2


def test_save_evaluation_twice_updates_instead_of_duplicating(admin_client, scenario):
    admin_client.post(url(scenario['application'].id), payload(scenario), format='json')
    admin_client.post(
        url(scenario['application'].id),
        payload(scenario, first_score=2, second_score=2),
        format='json',
    )

    assert Evaluation.objects.count() == 2
    assert {float(e.score) for e in Evaluation.objects.all()} == {2.0}


def test_two_evaluators_scores_are_averaged(
    admin_client, evaluator_client, evaluator_user, scenario
):
    """Dois corretores independentes, como o planejamento exige."""
    from apps.recruitment.models import StageAssignment

    admin_client.post(url(scenario['application'].id), payload(scenario), format='json')

    StageAssignment.objects.create(
        stage=scenario['stage'],
        application=scenario['application'],
        evaluator=evaluator_user,
    )
    evaluator_client.post(
        url(scenario['application'].id),
        payload(scenario, first_score=3, second_score=5),
        format='json',
    )

    r = admin_client.get(url(scenario['application'].id))
    block = r.data[0]
    averages = {c['name']: c['average'] for c in block['criteria']}
    assert averages['Pensamento crítico'] == 4.0
    assert averages['Criatividade'] == 4.0
    assert block['stage_average'] == 4.0
    assert len(block['notes']) == 2


def test_stage_average_is_mean_of_criteria_averages(admin_client, scenario):
    admin_client.post(
        url(scenario['application'].id),
        payload(scenario, first_score=5, second_score=3),
        format='json',
    )
    r = admin_client.get(url(scenario['application'].id))
    assert r.data[0]['stage_average'] == 4.0


def test_evaluation_fails_when_criterion_not_in_stage(admin_client, scenario, process):
    other_stage = StageFactory(process=process, order=2)
    outsider = EvaluationCriterionFactory(stage=other_stage)

    r = admin_client.post(
        url(scenario['application'].id),
        {
            'stage': str(scenario['stage'].id),
            'scores': [{'criterion': str(outsider.id), 'score': 4}],
        },
        format='json',
    )
    assert r.status_code == 400
    assert not Evaluation.objects.exists()


def test_evaluation_fails_with_score_out_of_range(admin_client, scenario):
    r = admin_client.post(
        url(scenario['application'].id),
        payload(scenario, first_score=6),
        format='json',
    )
    assert r.status_code == 400
    assert not Evaluation.objects.exists()


def test_evaluation_fails_when_process_closed(admin_client, scenario, process):
    process.status = ProcessStatus.CLOSED
    process.save()

    r = admin_client.post(
        url(scenario['application'].id), payload(scenario), format='json'
    )
    assert r.status_code == 400


def test_candidate_cannot_access_evaluation_endpoints(candidate_client, scenario):
    assert candidate_client.get(url(scenario['application'].id)).status_code == 403
    assert (
        candidate_client.post(
            url(scenario['application'].id), payload(scenario), format='json'
        ).status_code
        == 403
    )


def test_summary_is_empty_without_evaluations(admin_client, scenario):
    assert admin_client.get(url(scenario['application'].id)).data == []


def test_application_detail_exposes_stage_criteria(admin_client, scenario):
    r = admin_client.get(f'/api/v1/admin/applications/{scenario["application"].id}/')
    assert r.status_code == 200
    assert [c['name'] for c in r.data['criteria']] == [
        'Pensamento crítico',
        'Criatividade',
    ]
    # O peso vai junto: a ficha mostra a média da etapa enquanto o avaliador
    # digita, e sem ele a conta do frontend não seria a mesma do backend.
    assert all('weight' in c for c in r.data['criteria'])
    assert all(isinstance(c['weight'], float) for c in r.data['criteria'])


def test_application_detail_returns_my_scores(admin_client, scenario):
    admin_client.post(url(scenario['application'].id), payload(scenario), format='json')

    r = admin_client.get(f'/api/v1/admin/applications/{scenario["application"].id}/')
    assert r.data['my_scores'][str(scenario['first'].id)] == 5.0
    assert r.data['final_score'] == 4.0
