import pytest

from .factories import ProcessFactory, StageFactory


@pytest.fixture(autouse=True)
def email_locmem(settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


@pytest.fixture
def process(db):
    return ProcessFactory()


@pytest.fixture
def stage(process):
    return StageFactory(process=process, order=1)


@pytest.fixture
def admin_user(db):
    from apps.teams.tests.factories import UserFactory

    user = UserFactory()
    user.is_staff = True
    user.save(update_fields=['is_staff'])
    return user


@pytest.fixture
def admin_client(admin_user):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(admin_user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def candidate_client(db):
    """Client autenticado como candidato.

    O participante fica acessível em `candidate_client.participant` para os
    testes que precisam criar dados vinculados a ele.
    """
    from apps.teams.tests.factories import ParticipantFactory
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    participant = ParticipantFactory()
    client = APIClient()
    token = RefreshToken.for_user(participant.user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    client.participant = participant
    return client
