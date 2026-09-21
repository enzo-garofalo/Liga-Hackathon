"""Desistência da própria inscrição.

A regra é o prazo: enquanto as inscrições estão abertas, o candidato entra e
sai à vontade; depois, não sai mais pela plataforma. O resto do arquivo cuida
de não deixar a saída virar porta só de ida nem sujar os números do organizador.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.recruitment.models import Application, ApplicationStatus, ProcessStatus
from apps.recruitment.services.processes import process_stats

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def apply_url(process):
    return f'/api/v1/processes/{process.id}/apply/'


def withdraw_url(process):
    return f'/api/v1/processes/{process.id}/withdraw/'


@pytest.fixture
def aberto(process):
    """Processo publicado com inscrições abertas agora."""
    StageFactory(process=process, order=1, name='Inscrição')
    StageFactory(process=process, order=2, name='Resolução do Case')
    process.status = ProcessStatus.PUBLISHED
    process.registration_start = timezone.now() - timedelta(days=2)
    process.registration_end = timezone.now() + timedelta(days=5)
    process.save()
    return process


def fecha_inscricoes(process):
    """Prazo no passado, como fica depois que as inscrições encerram."""
    process.registration_start = timezone.now() - timedelta(days=10)
    process.registration_end = timezone.now() - timedelta(minutes=1)
    process.save(update_fields=['registration_start', 'registration_end'])


# ── Dentro do prazo ───────────────────────────────────────────────


def test_candidate_withdraws_while_registration_is_open(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))

    r = candidate_client.post(withdraw_url(aberto))

    assert r.status_code == 200
    application = Application.objects.get(process=aberto)
    assert application.status == ApplicationStatus.WITHDRAWN


def test_withdrawing_does_not_delete_the_application(candidate_client, aberto):
    """A linha fica: nela moram o código do candidato e o que ele já entregou."""
    candidate_client.post(apply_url(aberto))
    code = Application.objects.get(process=aberto).code

    candidate_client.post(withdraw_url(aberto))

    assert Application.objects.filter(process=aberto).count() == 1
    assert Application.objects.get(process=aberto).code == code


def test_candidate_can_apply_again_after_withdrawing(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))
    candidate_client.post(withdraw_url(aberto))

    r = candidate_client.post(apply_url(aberto))

    assert r.status_code == 201
    application = Application.objects.get(process=aberto)
    assert application.status == ApplicationStatus.IN_PROGRESS
    assert application.current_stage == aberto.first_stage


def test_applying_again_keeps_the_same_code(candidate_client, aberto):
    """Código novo a cada ida e volta bagunçaria a correção anônima."""
    candidate_client.post(apply_url(aberto))
    code = Application.objects.get(process=aberto).code
    candidate_client.post(withdraw_url(aberto))

    candidate_client.post(apply_url(aberto))

    assert Application.objects.get(process=aberto).code == code


def test_the_process_offers_to_apply_again(candidate_client, aberto):
    """Sem isto, cancelar era porta só de ida: a tela seguia dizendo inscrito."""
    candidate_client.post(apply_url(aberto))
    candidate_client.post(withdraw_url(aberto))

    r = candidate_client.get(f'/api/v1/processes/{aberto.id}/')

    assert r.data['already_applied'] is False


def test_the_process_says_applied_while_the_application_is_active(
    candidate_client, aberto
):
    candidate_client.post(apply_url(aberto))

    r = candidate_client.get(f'/api/v1/processes/{aberto.id}/')

    assert r.data['already_applied'] is True


# ── Fora do prazo ─────────────────────────────────────────────────


def test_candidate_cannot_withdraw_after_registration_closes(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))
    fecha_inscricoes(aberto)

    r = candidate_client.post(withdraw_url(aberto))

    assert r.status_code == 400
    assert 'encerrou' in str(r.data)
    assert Application.objects.get(process=aberto).status == ApplicationStatus.IN_PROGRESS


def test_candidate_in_a_later_stage_cannot_withdraw(candidate_client, aberto):
    """Depois do prazo a pessoa já está no meio do processo."""
    candidate_client.post(apply_url(aberto))
    application = Application.objects.get(process=aberto)
    application.current_stage = aberto.stages.get(order=2)
    application.save(update_fields=['current_stage'])
    fecha_inscricoes(aberto)

    r = candidate_client.post(withdraw_url(aberto))

    assert r.status_code == 400
    assert Application.objects.get(process=aberto).status == ApplicationStatus.IN_PROGRESS


# ── Quem não pode desistir ────────────────────────────────────────


def test_withdrawing_without_an_application_is_refused(candidate_client, aberto):
    r = candidate_client.post(withdraw_url(aberto))

    assert r.status_code == 400
    assert 'não está inscrito' in str(r.data)


def test_withdrawing_twice_is_refused(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))
    candidate_client.post(withdraw_url(aberto))

    r = candidate_client.post(withdraw_url(aberto))

    assert r.status_code == 400


def test_finished_application_cannot_be_withdrawn(candidate_client, aberto):
    """Reprovado não vira desistente: quem decidiu foi a organização."""
    candidate_client.post(apply_url(aberto))
    application = Application.objects.get(process=aberto)
    application.status = ApplicationStatus.REJECTED
    application.save(update_fields=['status'])

    r = candidate_client.post(withdraw_url(aberto))

    assert r.status_code == 400
    assert Application.objects.get(process=aberto).status == ApplicationStatus.REJECTED


def test_anonymous_cannot_withdraw(client, aberto):
    r = client.post(withdraw_url(aberto))
    assert r.status_code == 401


def test_withdrawing_touches_only_your_own_application(candidate_client, aberto):
    """A candidatura sai da do próprio usuário, não de quem estiver no processo."""
    vizinha = ApplicationFactory(process=aberto, current_stage=aberto.first_stage)
    candidate_client.post(apply_url(aberto))

    candidate_client.post(withdraw_url(aberto))

    vizinha.refresh_from_db()
    assert vizinha.status == ApplicationStatus.IN_PROGRESS


# ── O que a tela precisa saber antes de oferecer o botão ──────────


def minhas(client):
    return client.get('/api/v1/me/applications/').data


def test_can_withdraw_is_true_while_registration_is_open(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))

    assert minhas(candidate_client)[0]['can_withdraw'] is True


def test_can_withdraw_is_false_after_registration_closes(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))
    fecha_inscricoes(aberto)

    assert minhas(candidate_client)[0]['can_withdraw'] is False


def test_can_withdraw_is_false_for_a_finished_application(candidate_client, aberto):
    candidate_client.post(apply_url(aberto))
    application = Application.objects.get(process=aberto)
    application.status = ApplicationStatus.APPROVED
    application.save(update_fields=['status'])

    assert minhas(candidate_client)[0]['can_withdraw'] is False


def test_can_withdraw_matches_what_the_endpoint_does(candidate_client, aberto):
    """A pergunta e a ação não podem discordar.

    Se `can_withdraw` disser sim e o endpoint recusar, a pessoa clica num botão
    que só devolve erro; ao contrário, o botão some sem motivo.
    """
    candidate_client.post(apply_url(aberto))

    for preparar in (
        lambda: None,
        lambda: fecha_inscricoes(aberto),
    ):
        preparar()
        prometido = minhas(candidate_client)[0]['can_withdraw']
        aconteceu = candidate_client.post(withdraw_url(aberto)).status_code == 200
        assert prometido is aconteceu
        if aconteceu:
            candidate_client.post(apply_url(aberto))


# ── O que o organizador vê ────────────────────────────────────────


def test_withdrawn_does_not_count_as_enrolled(candidate_client, aberto):
    ApplicationFactory(process=aberto, current_stage=aberto.first_stage)
    candidate_client.post(apply_url(aberto))
    assert process_stats(aberto)['total'] == 2

    candidate_client.post(withdraw_url(aberto))

    stats = process_stats(aberto)
    assert stats['total'] == 1
    assert stats['withdrawn'] == 1
    assert stats['in_progress'] == 1


def test_organizer_cannot_move_someone_who_withdrew(admin_client, candidate_client, aberto):
    candidate_client.post(apply_url(aberto))
    candidate_client.post(withdraw_url(aberto))
    application = Application.objects.get(process=aberto)

    r = admin_client.post(
        f'/api/v1/admin/processes/{aberto.id}/applications/bulk-action/',
        {
            'action': 'move_stage',
            'applications': [str(application.id)],
            'target_stage': str(aberto.stages.get(order=2).id),
        },
        format='json',
    )

    assert r.status_code == 400
    assert Application.objects.get(process=aberto).status == ApplicationStatus.WITHDRAWN
