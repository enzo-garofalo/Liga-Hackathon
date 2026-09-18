import pytest

from apps.teams.models import Participant

from .factories import ParticipantFactory

pytestmark = pytest.mark.django_db


REGISTER_URL = '/api/v1/auth/register/'
TOKEN_URL = '/api/v1/auth/token/'
ME_URL = '/api/v1/me/'

VALID_REGISTER = {
    'email': 'ana@x.com',
    'password': 'strongpass123',
    'full_name': 'Ana',
    'course': 'CC',
    'semester': 4,
    'bio': 'oi',
}


def test_register_returns_201_with_valid_data(api_client):
    r = api_client.post(REGISTER_URL, VALID_REGISTER, format='json')
    assert r.status_code == 201
    assert r.data['email'] == 'ana@x.com'
    assert Participant.objects.filter(user__username='ana@x.com').exists()


def test_login_returns_tokens(api_client):
    api_client.post(REGISTER_URL, VALID_REGISTER, format='json')
    r = api_client.post(
        TOKEN_URL,
        {'email': 'ana@x.com', 'password': 'strongpass123'},
        format='json',
    )
    assert r.status_code == 200
    assert 'access' in r.data and 'refresh' in r.data


def test_login_fails_wrong_password(api_client):
    api_client.post(REGISTER_URL, VALID_REGISTER, format='json')
    r = api_client.post(
        TOKEN_URL,
        {'email': 'ana@x.com', 'password': 'wrong'},
        format='json',
    )
    assert r.status_code == 401


def test_me_returns_profile_when_authenticated(auth, participant):
    client = auth(participant.user)
    r = client.get(ME_URL)
    assert r.status_code == 200
    assert r.data['email'] == participant.user.email
    assert r.data['has_team'] is False
    assert r.data['team'] is None


def test_me_returns_401_when_unauthenticated(api_client):
    r = api_client.get(ME_URL)
    assert r.status_code == 401


def test_me_patch_updates_profile(auth):
    p = ParticipantFactory(full_name='Old Name', semester=1)
    client = auth(p.user)
    r = client.patch(ME_URL, {'full_name': 'New Name', 'semester': 5}, format='json')
    assert r.status_code == 200
    p.refresh_from_db()
    assert p.full_name == 'New Name'
    assert p.semester == 5


ADMIN_TOKEN_URL = '/api/v1/auth/admin/token/'


def test_admin_login_rejects_who_is_not_staff(api_client):
    """O login de organizador é aberto; quem barra não-staff é o serializer.

    Sem esta trava, um candidato entraria pela tela da comissão. Os endpoints
    `/admin/` continuariam recusando por `IsAdminUser`, mas a pessoa cairia num
    painel que erra em tudo — e o acesso deve parar no login.
    """
    api_client.post(REGISTER_URL, VALID_REGISTER, format='json')

    r = api_client.post(
        ADMIN_TOKEN_URL,
        {'email': 'ana@x.com', 'password': 'strongpass123'},
        format='json',
    )
    assert r.status_code == 401
    assert 'access' not in r.data


def test_admin_login_accepts_staff(api_client, django_user_model):
    """Contraprova: a trava não pode barrar quem é da organização."""
    django_user_model.objects.create_user(
        username='org@x.com', email='org@x.com', password='strongpass123', is_staff=True
    )

    r = api_client.post(
        ADMIN_TOKEN_URL,
        {'email': 'org@x.com', 'password': 'strongpass123'},
        format='json',
    )
    assert r.status_code == 200
    assert 'access' in r.data
