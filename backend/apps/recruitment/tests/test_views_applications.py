import pytest

from apps.recruitment.models import ApplicationStatus, ProcessStatus

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    ProcessFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db

URL = '/api/v1/me/applications/'


@pytest.fixture
def published(process):
    StageFactory(process=process, order=1, name='Inscrição')
    StageFactory(process=process, order=2, name='Case')
    StageFactory(process=process, order=3, name='Entrevista')
    process.status = ProcessStatus.PUBLISHED
    process.save()
    return process


def test_lists_only_own_applications(candidate_client, published):
    mine = ApplicationFactory(
        process=published, participant=candidate_client.participant
    )
    ApplicationFactory(process=published)

    r = candidate_client.get(URL)
    assert r.status_code == 200
    assert [row['id'] for row in r.data] == [str(mine.id)]


def test_list_includes_process_and_stage_info(candidate_client, published):
    stage = published.stages.get(order=2)
    ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        current_stage=stage,
    )

    row = candidate_client.get(URL).data[0]
    assert row['process_name'] == published.name
    assert row['current_stage_name'] == 'Case'
    assert row['stage_count'] == 3


def test_detail_returns_stage_timeline(candidate_client, published):
    application = ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        current_stage=published.stages.get(order=2),
    )

    r = candidate_client.get(f'{URL}{application.id}/')
    assert r.status_code == 200
    assert [(s['name'], s['state']) for s in r.data['stages']] == [
        ('Inscrição', 'done'),
        ('Case', 'current'),
        ('Entrevista', 'upcoming'),
    ]


def test_detail_does_not_expose_scores_to_candidate(candidate_client, published):
    stage = published.stages.get(order=1)
    application = ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        current_stage=stage,
    )
    criterion = EvaluationCriterionFactory(stage=stage)
    EvaluationFactory(
        application=application, stage=stage, criterion=criterion, score=9
    )

    r = candidate_client.get(f'{URL}{application.id}/')
    payload = str(r.data)
    assert 'final_score' not in payload
    assert 'score' not in payload
    assert 'criteria' not in payload
    assert 'notes' not in payload


def test_detail_returns_404_for_other_participant(candidate_client, published):
    other = ApplicationFactory(process=published)
    assert candidate_client.get(f'{URL}{other.id}/').status_code == 404


def test_list_requires_authentication(client):
    assert client.get(URL).status_code == 401


def test_finished_application_keeps_status(candidate_client, published):
    application = ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        status=ApplicationStatus.APPROVED,
    )
    r = candidate_client.get(f'{URL}{application.id}/')
    assert r.data['status'] == 'approved'


def test_application_from_other_process_not_listed(candidate_client, published):
    other_process = ProcessFactory(status=ProcessStatus.PUBLISHED)
    ApplicationFactory(
        process=other_process, participant=candidate_client.participant
    )
    ApplicationFactory(process=published, participant=candidate_client.participant)

    assert len(candidate_client.get(URL).data) == 2


def test_approved_candidate_has_no_stage_in_progress(candidate_client, published):
    """Aprovado na última etapa não pode continuar vendo "Etapa atual".

    A tela do candidato desenha a etapa `current` girando, com o selo "Etapa
    atual". Depois da aprovação final não há mais o que esperar.
    """
    application = ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        current_stage=published.stages.get(order=3),
        status=ApplicationStatus.APPROVED,
    )

    r = candidate_client.get(f'{URL}{application.id}/')
    states = [s['state'] for s in r.data['stages']]
    assert 'current' not in states
    assert states == ['done', 'done', 'done']


def test_rejected_candidate_has_no_stage_in_progress(candidate_client, published):
    application = ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        current_stage=published.stages.get(order=2),
        status=ApplicationStatus.REJECTED,
    )

    r = candidate_client.get(f'{URL}{application.id}/')
    assert [(s['name'], s['state']) for s in r.data['stages']] == [
        ('Inscrição', 'done'),
        ('Case', 'done'),
        ('Entrevista', 'upcoming'),
    ]


def test_in_progress_candidate_still_has_a_current_stage(candidate_client, published):
    """Contraprova: a correção acima não pode apagar a etapa de quem segue no processo."""
    application = ApplicationFactory(
        process=published,
        participant=candidate_client.participant,
        current_stage=published.stages.get(order=2),
        status=ApplicationStatus.IN_PROGRESS,
    )

    r = candidate_client.get(f'{URL}{application.id}/')
    current = [s['name'] for s in r.data['stages'] if s['state'] == 'current']
    assert current == ['Case']
