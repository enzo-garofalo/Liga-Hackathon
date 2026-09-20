"""O quadro de distribuição: candidatos por etapa, e a escolha manual.

A pergunta do coordenador é "quem está no case e quem vai corrigir", então a
tela mostra gente antes de pedir número. Este arquivo cobre o que sustenta isso.
"""

import pytest

from apps.recruitment.models import (
    ApplicationStatus,
    Evaluation,
    ProcessOrganizer,
    ProcessStatus,
    StageAssignment,
)

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    ProcessFactory,
    StageFactory,
)
from apps.teams.tests.factories import ParticipantFactory

pytestmark = pytest.mark.django_db


def url(process):
    return f'/api/v1/admin/processes/{process.id}/assignments/'


@pytest.fixture
def quadro(process, evaluator_user):
    """Duas etapas, três candidatos espalhados entre elas."""
    case = StageFactory(
        process=process, order=1, name='Resolução do Case', anonymous_evaluation=True
    )
    pitch = StageFactory(process=process, order=2, name='Pitch')
    ana = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='Ana Lima'),
        current_stage=case,
        code='C-0001',
    )
    bruno = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='Bruno Reis'),
        current_stage=case,
        code='C-0002',
    )
    carla = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='Carla Dias'),
        current_stage=pitch,
        code='C-0003',
    )
    return {'case': case, 'pitch': pitch, 'ana': ana, 'bruno': bruno, 'carla': carla}


# ── O quadro ──────────────────────────────────────────────────────


def test_the_board_groups_candidates_by_stage(admin_client, process, quadro):
    r = admin_client.get(url(process))

    assert r.status_code == 200
    etapas = {e['name']: e for e in r.data['stages']}
    assert [c['name'] for c in etapas['Resolução do Case']['candidates']] == [
        'Ana Lima',
        'Bruno Reis',
    ]
    assert [c['name'] for c in etapas['Pitch']['candidates']] == ['Carla Dias']


def test_the_coordinator_sees_names_even_in_the_anonymous_stage(
    admin_client, process, quadro
):
    """Ele precisa saber quem está mandando para quem; o código vai junto."""
    r = admin_client.get(url(process))

    case = next(e for e in r.data['stages'] if e['anonymous_evaluation'])
    candidato = case['candidates'][0]
    assert candidato['name'] == 'Ana Lima'
    assert candidato['code'] == 'C-0001'


def test_an_empty_stage_comes_back_empty_not_missing(admin_client, process, quadro):
    """A etapa sem ninguém continua na lista, senão some sem explicação."""
    StageFactory(process=process, order=3, name='Entrevista')

    r = admin_client.get(url(process))

    entrevista = next(e for e in r.data['stages'] if e['name'] == 'Entrevista')
    assert entrevista['candidates'] == []


def test_someone_who_withdrew_is_not_in_the_board(admin_client, process, quadro):
    """Não há o que distribuir de quem desistiu."""
    quadro['ana'].status = ApplicationStatus.WITHDRAWN
    quadro['ana'].save(update_fields=['status'])

    r = admin_client.get(url(process))

    nomes = [c['name'] for e in r.data['stages'] for c in e['candidates']]
    assert 'Ana Lima' not in nomes


def test_the_board_shows_who_corrects_each_candidate(
    admin_client, process, quadro, evaluator_user
):
    StageAssignment.objects.create(
        stage=quadro['case'], application=quadro['ana'], evaluator=evaluator_user
    )

    r = admin_client.get(url(process))

    case = next(e for e in r.data['stages'] if e['name'] == 'Resolução do Case')
    ana = next(c for c in case['candidates'] if c['name'] == 'Ana Lima')
    bruno = next(c for c in case['candidates'] if c['name'] == 'Bruno Reis')
    assert ana['evaluators'] == [evaluator_user.id]
    assert bruno['evaluators'] == []


def test_the_board_is_only_for_the_coordinator(evaluator_client, process, quadro):
    r = evaluator_client.get(url(process))
    assert r.status_code == 403


# ── A escolha manual ──────────────────────────────────────────────


def escolher(client, process, application, evaluators, stages):
    return client.post(
        url(process),
        {
            'application': str(application.id),
            'evaluators': [str(u.id) for u in evaluators],
            'stages': [str(s.id) for s in stages],
        },
        format='json',
    )


def test_choosing_evaluators_for_one_stage(
    admin_client, process, quadro, evaluator_user
):
    r = escolher(admin_client, process, quadro['ana'], [evaluator_user], [quadro['case']])

    assert r.status_code == 200
    assert StageAssignment.objects.filter(
        application=quadro['ana'], stage=quadro['case'], evaluator=evaluator_user
    ).exists()
    assert not StageAssignment.objects.filter(
        application=quadro['ana'], stage=quadro['pitch']
    ).exists()


def test_choosing_evaluators_for_every_stage(
    admin_client, process, quadro, evaluator_user
):
    """Designar numa etapa em que o candidato ainda não chegou é adiantar."""
    r = escolher(
        admin_client,
        process,
        quadro['ana'],
        [evaluator_user],
        [quadro['case'], quadro['pitch']],
    )

    assert r.status_code == 200
    assert StageAssignment.objects.filter(application=quadro['ana']).count() == 2


def test_choosing_replaces_instead_of_adding(
    admin_client, process, quadro, evaluator_user, admin_user
):
    """O modal mostra quem está lá: sem substituir, não haveria como tirar."""
    escolher(admin_client, process, quadro['ana'], [evaluator_user], [quadro['case']])

    escolher(admin_client, process, quadro['ana'], [admin_user], [quadro['case']])

    designados = list(
        StageAssignment.objects.filter(
            application=quadro['ana'], stage=quadro['case']
        ).values_list('evaluator_id', flat=True)
    )
    assert designados == [admin_user.id]


def test_removing_everyone_keeps_the_scores(
    admin_client, process, quadro, evaluator_user
):
    """Tirar da distribuição não apaga o que a pessoa já avaliou."""
    criterion = EvaluationCriterionFactory(stage=quadro['case'], weight=100)
    EvaluationFactory(
        application=quadro['ana'],
        stage=quadro['case'],
        criterion=criterion,
        evaluator=evaluator_user,
        score=4,
    )
    escolher(admin_client, process, quadro['ana'], [evaluator_user], [quadro['case']])

    escolher(admin_client, process, quadro['ana'], [], [quadro['case']])

    assert not StageAssignment.objects.filter(application=quadro['ana']).exists()
    assert Evaluation.objects.filter(evaluator=evaluator_user).count() == 1


def test_choosing_without_a_stage_is_refused(
    admin_client, process, quadro, evaluator_user
):
    r = escolher(admin_client, process, quadro['ana'], [evaluator_user], [])

    assert r.status_code == 400
    assert 'etapa' in str(r.data)


def test_cannot_choose_someone_outside_the_process(
    admin_client, process, quadro, evaluator_user
):
    ProcessOrganizer.objects.filter(user=evaluator_user).delete()

    r = escolher(admin_client, process, quadro['ana'], [evaluator_user], [quadro['case']])

    assert r.status_code == 400
    assert not StageAssignment.objects.filter(application=quadro['ana']).exists()


def test_a_stage_from_another_process_is_refused(admin_client, process, quadro):
    outro = ProcessFactory()
    alheia = StageFactory(process=outro, order=1)

    r = admin_client.post(
        url(process),
        {
            'application': str(quadro['ana'].id),
            'evaluators': [],
            'stages': [str(alheia.id)],
        },
        format='json',
    )

    # A etapa de outro processo nem entra na lista: sobra nenhuma.
    assert r.status_code == 400


def test_an_application_from_another_process_is_refused(admin_client, process, quadro):
    outro = ProcessFactory()
    alheia = ApplicationFactory(process=outro)

    r = admin_client.post(
        url(process),
        {
            'application': str(alheia.id),
            'evaluators': [],
            'stages': [str(quadro['case'].id)],
        },
        format='json',
    )

    assert r.status_code == 404


def test_a_closed_process_does_not_accept_new_distribution(
    admin_client, process, quadro, evaluator_user
):
    process.status = ProcessStatus.CLOSED
    process.save(update_fields=['status'])

    r = escolher(admin_client, process, quadro['ana'], [evaluator_user], [quadro['case']])

    assert r.status_code == 400


def test_choosing_is_only_for_the_coordinator(
    evaluator_client, process, quadro, evaluator_user
):
    r = escolher(
        evaluator_client, process, quadro['ana'], [evaluator_user], [quadro['case']]
    )

    assert r.status_code == 403


def test_the_answer_already_brings_the_board_back(
    admin_client, process, quadro, evaluator_user
):
    """A tela não precisa de uma segunda chamada para se redesenhar."""
    r = escolher(admin_client, process, quadro['ana'], [evaluator_user], [quadro['case']])

    case = next(e for e in r.data['stages'] if e['name'] == 'Resolução do Case')
    ana = next(c for c in case['candidates'] if c['name'] == 'Ana Lima')
    assert ana['evaluators'] == [evaluator_user.id]
    assert r.data['workload'][str(evaluator_user.id)] == 1
