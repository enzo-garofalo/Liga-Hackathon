import pytest

from apps.recruitment.models import ApplicationStatus
from apps.teams.tests.factories import ParticipantFactory

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


def url(process_id, query=''):
    return f'/api/v1/admin/processes/{process_id}/applications/{query}'


def names(response):
    return [row['participant_name'] for row in response.data['results']]


@pytest.fixture
def populated(process):
    stage_one = StageFactory(process=process, order=1)
    stage_two = StageFactory(process=process, order=2)

    ana = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='Ana Lima', course='CC'),
        current_stage=stage_one,
    )
    bruno = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='Bruno Reitano', course='ES'),
        current_stage=stage_two,
        status=ApplicationStatus.APPROVED,
    )
    joao = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='João Silva', course='ES'),
        current_stage=stage_one,
    )
    return {
        'stage_one': stage_one,
        'stage_two': stage_two,
        'ana': ana,
        'bruno': bruno,
        'joao': joao,
    }


def test_list_returns_all_applications(admin_client, process, populated):
    r = admin_client.get(url(process.id))
    assert r.status_code == 200
    assert r.data['count'] == 3


def test_search_filters_by_name(admin_client, process, populated):
    r = admin_client.get(url(process.id, '?search=bruno'))
    assert names(r) == ['Bruno Reitano']


def test_filter_by_stage(admin_client, process, populated):
    r = admin_client.get(url(process.id, f'?stage={populated["stage_two"].id}'))
    assert names(r) == ['Bruno Reitano']


def test_filter_by_status(admin_client, process, populated):
    r = admin_client.get(url(process.id, '?status=approved'))
    assert names(r) == ['Bruno Reitano']


def test_filter_by_course(admin_client, process, populated):
    r = admin_client.get(url(process.id, '?course=ES'))
    assert sorted(names(r)) == ['Bruno Reitano', 'João Silva']


def test_filters_combine(admin_client, process, populated):
    r = admin_client.get(
        url(process.id, f'?course=ES&stage={populated["stage_one"].id}')
    )
    assert names(r) == ['João Silva']


def test_default_ordering_is_by_name(admin_client, process, populated):
    r = admin_client.get(url(process.id))
    assert names(r) == ['Ana Lima', 'Bruno Reitano', 'João Silva']


def test_ordering_by_score_desc(admin_client, process, populated):
    stage = populated['stage_one']
    criterion = EvaluationCriterionFactory(stage=stage)
    EvaluationFactory(
        application=populated['ana'], stage=stage, criterion=criterion, score=6
    )
    EvaluationFactory(
        application=populated['joao'], stage=stage, criterion=criterion, score=9
    )

    r = admin_client.get(url(process.id, '?ordering=-score'))
    # Bruno não tem nota, então fica por último
    assert names(r) == ['João Silva', 'Ana Lima', 'Bruno Reitano']


def test_final_score_in_payload(admin_client, process, populated):
    stage = populated['stage_one']
    first = EvaluationCriterionFactory(stage=stage, order=1)
    second = EvaluationCriterionFactory(stage=stage, order=2)
    EvaluationFactory(
        application=populated['ana'], stage=stage, criterion=first, score=9
    )
    EvaluationFactory(
        application=populated['ana'], stage=stage, criterion=second, score=7
    )

    r = admin_client.get(url(process.id, '?search=ana'))
    assert r.data['results'][0]['final_score'] == 8.0


def test_application_without_evaluation_has_null_score(admin_client, process, populated):
    r = admin_client.get(url(process.id, '?search=bruno'))
    assert r.data['results'][0]['final_score'] is None


def test_candidate_cannot_list_applications(candidate_client, process):
    assert candidate_client.get(url(process.id)).status_code == 403


def test_row_exposes_participant_id_for_targeted_communication(
    admin_client, process, populated
):
    """A tabela precisa do id do participante: o comunicado a candidatos
    específicos é endereçado por participante, não por candidatura."""
    r = admin_client.get(url(process.id, '?search=ana'))
    row = r.data['results'][0]
    assert str(row['participant']) == str(populated['ana'].participant_id)
