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
