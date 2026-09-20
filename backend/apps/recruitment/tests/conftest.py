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
    """Coordenador do processo: vê identidade e avalia sem designação."""
    from apps.teams.tests.factories import UserFactory

    from apps.recruitment.models import OrganizerProfile

    user = UserFactory()
    user.is_staff = True
    user.save(update_fields=['is_staff'])
    OrganizerProfile.objects.create(
        user=user, full_name='Coordenador', is_coordinator=True
    )
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


@pytest.fixture
def evaluator_user(db, process):
    """Avaliador comum: sem acesso à identidade e limitado às designações.

    Já entra como membro do processo do teste, porque é assim que avaliador
    existe no sistema: alguém que o coordenador chamou para um processo. Fora
    de um processo ele não enxerga nada, e é isso que `test_organizer_roles`
    verifica, usando um segundo processo ao qual ele não foi chamado.
    """
    from apps.recruitment.models import OrganizerProfile, ProcessOrganizer
    from apps.teams.tests.factories import UserFactory

    user = UserFactory()
    user.is_staff = True
    user.save(update_fields=['is_staff'])
    OrganizerProfile.objects.create(
        user=user, full_name='Avaliador', is_coordinator=False
    )
    ProcessOrganizer.objects.create(process=process, user=user)
    return user


@pytest.fixture
def evaluator_client(evaluator_user):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(evaluator_user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    client.user = evaluator_user
    return client
