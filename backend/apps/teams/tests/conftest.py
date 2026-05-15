import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .factories import ParticipantFactory


@pytest.fixture(autouse=True)
def email_locmem(settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def participant(db):
    return ParticipantFactory()


def _auth_for(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def auth():
    return _auth_for


@pytest.fixture
def auth_client(participant):
    return _auth_for(participant.user)
