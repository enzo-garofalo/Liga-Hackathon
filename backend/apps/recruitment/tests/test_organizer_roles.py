"""Dois cargos de organizador, e a diferença entre eles.

O coordenador conduz o processo. O avaliador entra a convite, corrige o que lhe
foi distribuído e não decide nada. Este arquivo cobre as duas metades disso: o
que o avaliador **não** consegue fazer, e o que ele consegue ver.
"""

import pytest

from apps.recruitment.models import (
    Application,
    Evaluation,
    ProcessStatus,
    StageAssignment,
)

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    ProcessFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def cenario(process, evaluator_user):
    """Processo com duas candidaturas, uma delas distribuída ao avaliador."""
    stage = StageFactory(process=process, order=1, name='Resolução do Case')
    EvaluationCriterionFactory(stage=stage)
    minha = ApplicationFactory(process=process, current_stage=stage, code='C-0001')
    outra = ApplicationFactory(process=process, current_stage=stage, code='C-0002')

    # A entrada no processo vem da fixture `evaluator_user`: é o que a tornou
    # avaliador deste processo, e não de qualquer um.
    StageAssignment.objects.create(
        stage=stage, application=minha, evaluator=evaluator_user
    )
    return {'stage': stage, 'minha': minha, 'outra': outra}


def process_url(process):
    return f'/api/v1/admin/processes/{process.id}/'


# ── O que o avaliador não faz ─────────────────────────────────────


def test_evaluator_cannot_publish_the_process(evaluator_client, process, cenario):
    r = evaluator_client.post(f'{process_url(process)}publish/')
    assert r.status_code == 403


def test_evaluator_cannot_close_the_process(evaluator_client, process, cenario):
    r = evaluator_client.post(f'{process_url(process)}close/')
    assert r.status_code == 403
    process.refresh_from_db()
    assert process.status != ProcessStatus.CLOSED


def test_evaluator_cannot_edit_the_process(evaluator_client, process, cenario):
    r = evaluator_client.patch(
        process_url(process), {'name': 'Renomeado'}, format='json'
    )
    assert r.status_code == 403
    process.refresh_from_db()
    assert process.name != 'Renomeado'


def test_evaluator_cannot_create_a_process(evaluator_client, process):
    r = evaluator_client.post(
        '/api/v1/admin/processes/',
        {
            'name': 'Processo do avaliador',
            'registration_start': '2026-01-01T00:00:00Z',
            'registration_end': '2026-02-01T00:00:00Z',
        },
        format='json',
    )
    assert r.status_code == 403


def test_evaluator_cannot_create_a_stage(evaluator_client, process, cenario):
    r = evaluator_client.post(
        f'{process_url(process)}stages/', {'name': 'Etapa nova'}, format='json'
    )
    assert r.status_code == 403


def test_evaluator_cannot_edit_a_stage(evaluator_client, cenario):
    r = evaluator_client.patch(
        f'/api/v1/admin/stages/{cenario["stage"].id}/',
        {'name': 'Outro nome'},
        format='json',
    )
    assert r.status_code == 403


def test_evaluator_cannot_approve_or_move(evaluator_client, process, cenario):
    """O que muda o rumo de um candidato e dispara e-mail é do coordenador."""
    r = evaluator_client.post(
        f'{process_url(process)}applications/bulk-action/',
        {'action': 'approve', 'applications': [str(cenario['minha'].id)]},
        format='json',
    )
    assert r.status_code == 403
    cenario['minha'].refresh_from_db()
    assert cenario['minha'].status == 'in_progress'


def test_evaluator_cannot_send_a_communication(evaluator_client, process, cenario):
    r = evaluator_client.post(
        f'{process_url(process)}communications/',
        {'audience': 'all', 'subject': 'Oi', 'message': 'Mensagem'},
        format='json',
    )
    assert r.status_code == 403


def test_evaluator_cannot_distribute_work(evaluator_client, cenario):
    r = evaluator_client.post(
        f'/api/v1/admin/stages/{cenario["stage"].id}/assignments/auto/',
        {'evaluators': [], 'per_application': 2},
        format='json',
    )
    assert r.status_code == 403


def test_evaluator_cannot_invite_another_organizer(evaluator_client, process, cenario):
    r = evaluator_client.post(
        f'{process_url(process)}organizers/',
        {'email': 'alguem@exemplo.com'},
        format='json',
    )
    assert r.status_code == 403


# ── O que o coordenador continua fazendo ──────────────────────────


def test_coordinator_still_edits_the_process(admin_client, process, cenario):
    r = admin_client.patch(
        process_url(process), {'name': 'Nome novo'}, format='json'
    )
    assert r.status_code == 200
    process.refresh_from_db()
    assert process.name == 'Nome novo'


def test_coordinator_still_moves_candidates(admin_client, process, cenario):
    r = admin_client.post(
        f'{process_url(process)}applications/bulk-action/',
        {'action': 'discard', 'applications': [str(cenario['outra'].id)]},
        format='json',
    )
    assert r.status_code == 200


# ── O alcance do avaliador ────────────────────────────────────────


def test_evaluator_only_sees_processes_they_were_called_to(
    evaluator_client, process, cenario
):
    outro = ProcessFactory()

    r = evaluator_client.get('/api/v1/admin/processes/')

    ids = [row['id'] for row in r.data]
    assert str(process.id) in ids
    assert str(outro.id) not in ids


def test_evaluator_cannot_open_a_process_they_are_not_in(evaluator_client, cenario):
    outro = ProcessFactory()

    r = evaluator_client.get(process_url(outro))

    assert r.status_code == 404


def test_coordinator_sees_every_process(admin_client, process, cenario):
    outro = ProcessFactory()

    r = admin_client.get('/api/v1/admin/processes/')

    ids = [row['id'] for row in r.data]
    assert {str(process.id), str(outro.id)} <= set(ids)


def test_evaluator_list_shows_only_their_queue(evaluator_client, process, cenario):
    r = evaluator_client.get(f'{process_url(process)}applications/')

    ids = [row['id'] for row in r.data['results']]
    assert ids == [str(cenario['minha'].id)]


def test_coordinator_list_shows_everyone(admin_client, process, cenario):
    r = admin_client.get(f'{process_url(process)}applications/')

    ids = {row['id'] for row in r.data['results']}
    assert ids == {str(cenario['minha'].id), str(cenario['outra'].id)}


def test_evaluator_cannot_open_an_application_outside_their_queue(
    evaluator_client, cenario
):
    """404 e não 403: a candidatura dos outros não existe para ele."""
    r = evaluator_client.get(f'/api/v1/admin/applications/{cenario["outra"].id}/')
    assert r.status_code == 404


def test_evaluator_opens_their_own_queue(evaluator_client, cenario):
    r = evaluator_client.get(f'/api/v1/admin/applications/{cenario["minha"].id}/')
    assert r.status_code == 200


# ── A trava da designação ─────────────────────────────────────────


def evaluation_payload(stage):
    criterion = stage.criteria.first()
    return {'stage': str(stage.id), 'scores': [{'criterion': str(criterion.id), 'score': 4}]}


def test_evaluator_scores_what_was_distributed_to_them(evaluator_client, cenario):
    r = evaluator_client.post(
        f'/api/v1/admin/applications/{cenario["minha"].id}/evaluations/',
        evaluation_payload(cenario['stage']),
        format='json',
    )

    assert r.status_code == 200
    assert Evaluation.objects.filter(application=cenario['minha']).exists()


def test_evaluator_cannot_score_outside_their_queue(evaluator_client, cenario):
    r = evaluator_client.post(
        f'/api/v1/admin/applications/{cenario["outra"].id}/evaluations/',
        evaluation_payload(cenario['stage']),
        format='json',
    )

    assert r.status_code == 404
    assert not Evaluation.objects.filter(application=cenario['outra']).exists()


def test_coordinator_scores_anyone(admin_client, cenario):
    r = admin_client.post(
        f'/api/v1/admin/applications/{cenario["outra"].id}/evaluations/',
        evaluation_payload(cenario['stage']),
        format='json',
    )

    assert r.status_code == 200


def test_assignment_removed_takes_the_access_with_it(evaluator_client, cenario):
    """Tirar a designação tira o acesso junto, sem apagar o que já foi dado."""
    StageAssignment.objects.filter(application=cenario['minha']).delete()

    r = evaluator_client.get(f'/api/v1/admin/applications/{cenario["minha"].id}/')

    assert r.status_code == 404
    assert Application.objects.filter(id=cenario['minha'].id).exists()
