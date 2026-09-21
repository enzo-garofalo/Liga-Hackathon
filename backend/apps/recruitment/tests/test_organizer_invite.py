"""Convidar gente para ajudar num processo.

O coordenador digita um e-mail; a pessoa recebe um link e cria a própria senha.
Nenhuma tabela de convite, nenhuma senha provisória circulando por aí.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail

from apps.recruitment.models import (
    Evaluation,
    OrganizerProfile,
    ProcessOrganizer,
    StageAssignment,
)
from apps.recruitment.services import organizers

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db

User = get_user_model()
CONVIDADO = 'novo.avaliador@exemplo.com'


def url(process):
    return f'/api/v1/admin/processes/{process.id}/organizers/'


def convidar(client, process, email=CONVIDADO, **extra):
    return client.post(url(process), {'email': email, **extra}, format='json')


# ── Convidar ──────────────────────────────────────────────────────


def test_invite_creates_the_account_as_organizer(admin_client, process):
    r = convidar(admin_client, process, full_name='Ana Souza', role_title='Diretora')

    assert r.status_code == 200
    user = User.objects.get(email=CONVIDADO)
    assert user.is_staff is True
    assert user.organizer_profile.full_name == 'Ana Souza'
    assert ProcessOrganizer.objects.filter(process=process, user=user).exists()


def test_the_invited_account_has_no_password_yet(admin_client, process):
    """Ninguém inventa senha para ninguém: quem escolhe é a pessoa, pelo link."""
    convidar(admin_client, process)

    user = User.objects.get(email=CONVIDADO)
    assert user.has_usable_password() is False


def test_the_invited_person_never_becomes_a_coordinator(admin_client, process):
    """Coordenação não se delega por formulário."""
    convidar(admin_client, process)

    user = User.objects.get(email=CONVIDADO)
    assert user.organizer_profile.is_coordinator is False


def test_the_invite_email_carries_a_link_to_create_the_password(
    admin_client, process
):
    convidar(admin_client, process)

    assert len(mail.outbox) == 1
    corpo = mail.outbox[0].body
    assert 'reset-password?uid=' in corpo
    assert 'convite=1' in corpo
    assert mail.outbox[0].to == [CONVIDADO]


def test_the_invite_link_lets_the_person_set_a_password(admin_client, process, client):
    """O link do convite é o mesmo motor do esqueci minha senha, ponta a ponta."""
    convidar(admin_client, process)
    user = User.objects.get(email=CONVIDADO)
    link = organizers.link_de_convite(user)
    uid = link.split('uid=')[1].split('&')[0]
    token = link.split('token=')[1].split('&')[0]

    r = client.post(
        '/api/v1/auth/password-reset/confirm/',
        {'uid': uid, 'token': token, 'password': 'senhaBoa#2026'},
        content_type='application/json',
    )

    assert r.status_code == 200
    user.refresh_from_db()
    assert user.check_password('senhaBoa#2026') is True


def test_inviting_someone_who_already_has_an_account_keeps_their_password(
    admin_client, process, evaluator_user
):
    """Conta que já existe não é recriada, e a senha dela não é mexida.

    A senha é gravada aqui de propósito: a `UserFactory` não persiste a dela,
    e sem isto o teste compararia o hash em memória com o vazio que está no
    banco, e passaria a acusar um problema que não existe.
    """
    evaluator_user.set_password('senhaBoa#2026')
    evaluator_user.save(update_fields=['password'])
    senha_antes = User.objects.get(pk=evaluator_user.pk).password

    ProcessOrganizer.objects.filter(user=evaluator_user).delete()
    r = convidar(admin_client, process, email=evaluator_user.email)

    assert r.status_code == 200
    evaluator_user.refresh_from_db()
    assert evaluator_user.password == senha_antes
    assert User.objects.filter(email=evaluator_user.email).count() == 1


def test_inviting_the_same_person_twice_is_refused(admin_client, process):
    convidar(admin_client, process)

    r = convidar(admin_client, process)

    assert r.status_code == 400
    assert ProcessOrganizer.objects.filter(process=process).count() == 1


def test_a_candidate_of_the_process_cannot_be_invited(
    admin_client, process, candidate_client
):
    """Ninguém corrige o próprio case."""
    stage = StageFactory(process=process, order=1)
    ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=stage,
    )

    r = convidar(
        admin_client, process, email=candidate_client.participant.user.email
    )

    assert r.status_code == 400
    assert 'candidata' in str(r.data)
    assert ProcessOrganizer.objects.filter(process=process).count() == 0


def test_the_list_includes_the_coordination(admin_client, admin_user, process):
    """A coordenação aparece sem ter sido chamada.

    Ela coordena todo processo, e esta lista é também a de quem pode entrar no
    rodízio da correção: sem isto o coordenador não conseguiria se incluir na
    própria distribuição, que é como a Liga corrige hoje.
    """
    r = admin_client.get(url(process))

    linha = next(row for row in r.data if row['user_id'] == admin_user.id)
    assert linha['is_coordinator'] is True
    assert not ProcessOrganizer.objects.filter(
        process=process, user=admin_user
    ).exists()


def test_nobody_appears_twice(admin_client, admin_user, process):
    """Coordenador que também foi chamado explicitamente entra uma vez só."""
    ProcessOrganizer.objects.create(process=process, user=admin_user)

    r = admin_client.get(url(process))

    ids = [row['user_id'] for row in r.data]
    assert ids.count(admin_user.id) == 1


def test_the_coordinator_can_be_given_corrections(
    admin_client, admin_user, evaluator_user, process
):
    """Distribuir para a coordenação funciona, sem ela estar em ProcessOrganizer."""
    stage = StageFactory(process=process, order=1)
    ApplicationFactory(process=process, current_stage=stage)

    r = admin_client.post(
        f'/api/v1/admin/stages/{stage.id}/assignments/auto/',
        {'evaluators': [str(admin_user.id), str(evaluator_user.id)]},
        format='json',
    )

    assert r.status_code == 201
    assert StageAssignment.objects.filter(evaluator=admin_user).exists()


def test_the_list_shows_who_is_still_pending(admin_client, process):
    convidar(admin_client, process)

    r = admin_client.get(url(process))

    linha = next(row for row in r.data if row['email'] == CONVIDADO)
    assert linha['pending'] is True
    assert linha['is_coordinator'] is False


def test_someone_who_already_logged_in_is_not_pending(
    admin_client, process, evaluator_user
):
    evaluator_user.set_password('senhaBoa#2026')
    evaluator_user.save(update_fields=['password'])

    r = admin_client.get(url(process))

    linha = next(row for row in r.data if row['email'] == evaluator_user.email)
    assert linha['pending'] is False


# ── Tirar do processo ─────────────────────────────────────────────


def test_removing_takes_the_assignments_but_keeps_the_scores(
    admin_client, process, evaluator_user
):
    """A nota já dada é trabalho feito e continua contando na média."""
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, weight=100)
    application = ApplicationFactory(process=process, current_stage=stage)
    StageAssignment.objects.create(
        stage=stage, application=application, evaluator=evaluator_user
    )
    EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        evaluator=evaluator_user,
        score=4,
    )

    r = admin_client.delete(f'{url(process)}{evaluator_user.id}/')

    assert r.status_code == 204
    assert not ProcessOrganizer.objects.filter(
        process=process, user=evaluator_user
    ).exists()
    assert not StageAssignment.objects.filter(evaluator=evaluator_user).exists()
    assert Evaluation.objects.filter(evaluator=evaluator_user).count() == 1


def test_removed_organizer_loses_access_to_the_process(
    admin_client, evaluator_client, evaluator_user, process
):
    admin_client.delete(f'{url(process)}{evaluator_user.id}/')

    r = evaluator_client.get(f'/api/v1/admin/processes/{process.id}/')

    assert r.status_code == 404


def test_the_coordinator_cannot_remove_themselves(admin_client, admin_user, process):
    ProcessOrganizer.objects.create(process=process, user=admin_user)

    r = admin_client.delete(f'{url(process)}{admin_user.id}/')

    assert r.status_code == 400


def test_removing_someone_who_is_not_in_the_process_is_refused(
    admin_client, process, evaluator_user
):
    ProcessOrganizer.objects.filter(user=evaluator_user).delete()

    r = admin_client.delete(f'{url(process)}{evaluator_user.id}/')

    assert r.status_code == 400


# ── Reenviar ──────────────────────────────────────────────────────


def test_resending_sends_the_email_again(admin_client, process):
    convidar(admin_client, process)
    user = User.objects.get(email=CONVIDADO)
    mail.outbox.clear()

    r = admin_client.post(f'{url(process)}{user.id}/')

    assert r.status_code == 200
    assert len(mail.outbox) == 1


def test_resending_to_someone_outside_the_process_is_refused(
    admin_client, process, evaluator_user
):
    ProcessOrganizer.objects.filter(user=evaluator_user).delete()

    r = admin_client.post(f'{url(process)}{evaluator_user.id}/')

    assert r.status_code == 400


# ── Distribuir só entre quem está no processo ─────────────────────


def test_cannot_distribute_to_someone_outside_the_process(
    admin_client, admin_user, process, evaluator_user
):
    """Distribuir para fora daria a essa pessoa acesso a candidatos de um
    processo para o qual ninguém a chamou."""
    stage = StageFactory(process=process, order=1)
    ApplicationFactory(process=process, current_stage=stage)
    ProcessOrganizer.objects.filter(user=evaluator_user).delete()

    r = admin_client.post(
        f'/api/v1/admin/stages/{stage.id}/assignments/auto/',
        {'evaluators': [str(admin_user.id), str(evaluator_user.id)]},
        format='json',
    )

    assert r.status_code == 400
    assert not StageAssignment.objects.filter(stage=stage).exists()


def test_distribution_only_covers_candidates_in_that_stage(
    admin_client, admin_user, evaluator_user, process
):
    """Distribuir o case é repartir quem tem case para corrigir."""
    case = StageFactory(process=process, order=1, name='Resolução do Case')
    pitch = StageFactory(process=process, order=2, name='Pitch')
    no_case = ApplicationFactory(process=process, current_stage=case)
    ApplicationFactory(process=process, current_stage=pitch)

    r = admin_client.post(
        f'/api/v1/admin/stages/{case.id}/assignments/auto/',
        {'evaluators': [str(admin_user.id), str(evaluator_user.id)]},
        format='json',
    )

    assert r.status_code == 201
    distribuidas = set(
        StageAssignment.objects.filter(stage=case).values_list(
            'application_id', flat=True
        )
    )
    assert distribuidas == {no_case.id}
