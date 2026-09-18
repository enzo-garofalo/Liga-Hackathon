"""Perfil do organizador."""

import pytest

from apps.recruitment.models import OrganizerProfile

pytestmark = pytest.mark.django_db

URL = '/api/v1/admin/me/'


def test_returns_profile_of_authenticated_organizer(admin_client, admin_user):
    r = admin_client.get(URL)
    assert r.status_code == 200
    assert r.data['email'] == admin_user.email
    assert r.data['full_name'] == 'Coordenador'
    assert r.data['is_coordinator'] is True


def test_creates_profile_on_first_visit(db):
    """Nem todo is_staff tem perfil — o superusuário do entrypoint, por exemplo."""
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    from apps.teams.tests.factories import UserFactory

    user = UserFactory()
    user.is_staff = True
    user.save(update_fields=['is_staff'])
    assert not OrganizerProfile.objects.filter(user=user).exists()

    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}'
    )

    r = client.get(URL)
    assert r.status_code == 200
    assert OrganizerProfile.objects.filter(user=user).exists()


def test_updates_editable_fields(admin_client):
    r = admin_client.patch(
        URL,
        {
            'full_name': 'Bruno Reitano',
            'role_title': 'Diretor de Operações',
            'phone': '(19) 99999-0000',
            'github': 'https://github.com/bruno',
        },
        format='json',
    )
    assert r.status_code == 200
    assert r.data['full_name'] == 'Bruno Reitano'
    assert r.data['role_title'] == 'Diretor de Operações'


def test_cannot_promote_itself_to_coordinator(admin_client, evaluator_client):
    """is_coordinator é somente leitura: concede acesso à identidade dos candidatos."""
    r = evaluator_client.patch(URL, {'is_coordinator': True}, format='json')
    assert r.status_code == 200
    assert r.data['is_coordinator'] is False


def test_candidate_cannot_access(candidate_client):
    assert candidate_client.get(URL).status_code == 403
