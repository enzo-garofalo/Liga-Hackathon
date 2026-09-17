"""Correção anônima: o avaliador vê o código, não a pessoa."""

import pytest

from apps.recruitment.models import StageAssignment

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    StageFactory,
)
from apps.teams.tests.factories import ParticipantFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def scenario(process, evaluator_user):
    stage = StageFactory(process=process, order=1)
    EvaluationCriterionFactory(stage=stage)
    application = ApplicationFactory(
        process=process,
        participant=ParticipantFactory(full_name='Ana Lima'),
        current_stage=stage,
        code='C-0001',
    )
    StageAssignment.objects.create(
        stage=stage, application=application, evaluator=evaluator_user
    )
    return {'stage': stage, 'application': application}


def detail_url(application_id):
    return f'/api/v1/admin/applications/{application_id}/'


def list_url(process_id):
    return f'/api/v1/admin/processes/{process_id}/applications/'


def test_evaluator_sees_code_instead_of_name(evaluator_client, scenario):
    r = evaluator_client.get(detail_url(scenario['application'].id))
    assert r.status_code == 200
    assert r.data['participant_name'] == 'C-0001'
    assert r.data['email'] is None
    assert r.data['phone'] is None
    assert r.data['github'] is None
    assert r.data['bio'] is None


def test_coordinator_sees_identity(admin_client, scenario):
    r = admin_client.get(detail_url(scenario['application'].id))
    assert r.data['participant_name'] == 'Ana Lima'
    assert r.data['email'] is not None


def test_candidate_list_is_anonymous_for_evaluator(evaluator_client, process, scenario):
    r = evaluator_client.get(list_url(process.id))
    names = [row['participant_name'] for row in r.data['results']]
    assert names == ['C-0001']
    assert r.data['results'][0]['participant_email'] is None


def test_identity_is_visible_when_anonymity_is_off(
    evaluator_client, process, scenario
):
    """A Liga pode desligar o anonimato por processo."""
    process.anonymous_evaluation = False
    process.save()

    r = evaluator_client.get(detail_url(scenario['application'].id))
    assert r.data['participant_name'] == 'Ana Lima'


def test_application_gets_sequential_code_on_apply(candidate_client, process):
    from apps.recruitment.models import Application

    StageFactory(process=process, order=2)
    process.status = 'published'
    process.save()

    candidate_client.post(f'/api/v1/processes/{process.id}/apply/')
    codes = list(Application.objects.values_list('code', flat=True))
    assert any(code.startswith('C-') for code in codes)


def test_superuser_sees_identity(db, scenario):
    """Quem administra a instalacao precisa enxergar os candidatos.

    Sem isto o superusuario ficaria preso ao codigo anonimo, e nao ha tela para
    marcar `is_coordinator` — foi o que aconteceu ao usar o sistema de verdade.
    """
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    from apps.teams.tests.factories import UserFactory

    root = UserFactory()
    root.is_staff = True
    root.is_superuser = True
    root.save(update_fields=['is_staff', 'is_superuser'])

    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(root).access_token}'
    )

    r = client.get(detail_url(scenario['application'].id))
    assert r.status_code == 200
    assert r.data['participant_name'] == 'Ana Lima'
