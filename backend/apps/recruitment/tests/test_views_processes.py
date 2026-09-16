from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.recruitment.models import Application, ApplicationStatus, ProcessStatus
from apps.teams.models import Notification, NotificationType

from .factories import ApplicationFactory, ProcessFactory, StageFactory

pytestmark = pytest.mark.django_db

URL = '/api/v1/processes/'


def apply_url(process_id):
    return f'{URL}{process_id}/apply/'


@pytest.fixture
def published(process):
    StageFactory(process=process, order=1, name='Inscrição')
    StageFactory(process=process, order=2, name='Entrevista')
    process.status = ProcessStatus.PUBLISHED
    process.save()
    return process


def test_list_returns_only_published(candidate_client, published):
    ProcessFactory(status=ProcessStatus.DRAFT)
    ProcessFactory(status=ProcessStatus.CLOSED)

    r = candidate_client.get(URL)
    assert r.status_code == 200
    assert [row['id'] for row in r.data] == [str(published.id)]


def test_list_reports_registration_open(candidate_client, published):
    r = candidate_client.get(URL)
    assert r.data[0]['registration_open'] is True
    assert r.data[0]['stage_count'] == 2


def test_list_reports_registration_closed_after_end(candidate_client, published):
    published.registration_start = timezone.now() - timedelta(days=10)
    published.registration_end = timezone.now() - timedelta(days=1)
    published.save()

    r = candidate_client.get(URL)
    assert r.data[0]['registration_open'] is False


def test_list_marks_already_applied(candidate_client, published):
    participant = candidate_client.participant
    ApplicationFactory(process=published, participant=participant)

    r = candidate_client.get(URL)
    assert r.data[0]['already_applied'] is True


def test_detail_returns_404_for_draft_process(candidate_client, process):
    assert candidate_client.get(f'{URL}{process.id}/').status_code == 404


def test_detail_does_not_expose_evaluation_criteria(candidate_client, published):
    r = candidate_client.get(f'{URL}{published.id}/')
    assert r.status_code == 200
    assert 'criteria' not in r.data['stages'][0]
    assert [s['name'] for s in r.data['stages']] == ['Inscrição', 'Entrevista']


def test_apply_creates_application_in_first_stage(candidate_client, published):
    r = candidate_client.post(apply_url(published.id))
    assert r.status_code == 201

    application = Application.objects.get(id=r.data['id'])
    assert application.status == ApplicationStatus.IN_PROGRESS
    assert application.current_stage.name == 'Inscrição'
    assert application.submitted_at is not None


def test_apply_fails_when_process_is_draft(candidate_client, process):
    StageFactory(process=process, order=1)
    r = candidate_client.post(apply_url(process.id))
    assert r.status_code == 400
    assert not Application.objects.exists()


def test_apply_fails_before_registration_start(candidate_client, published):
    published.registration_start = timezone.now() + timedelta(days=5)
    published.registration_end = timezone.now() + timedelta(days=10)
    published.save()

    r = candidate_client.post(apply_url(published.id))
    assert r.status_code == 400


def test_apply_fails_after_registration_end(candidate_client, published):
    published.registration_start = timezone.now() - timedelta(days=10)
    published.registration_end = timezone.now() - timedelta(days=1)
    published.save()

    r = candidate_client.post(apply_url(published.id))
    assert r.status_code == 400


def test_apply_fails_when_already_applied(candidate_client, published):
    assert candidate_client.post(apply_url(published.id)).status_code == 201
    assert candidate_client.post(apply_url(published.id)).status_code == 400
    assert Application.objects.count() == 1


def test_apply_requires_authentication(client, published):
    assert client.post(apply_url(published.id)).status_code == 401


def test_apply_sends_email_and_creates_notification(candidate_client, published):
    mail.outbox.clear()
    r = candidate_client.post(apply_url(published.id))
    assert r.status_code == 201

    assert len(mail.outbox) == 1
    assert 'Inscrição confirmada' in mail.outbox[0].subject

    notification = Notification.objects.get()
    assert notification.type == NotificationType.APPLICATION_CONFIRMED
    assert notification.link_to == f'/applications/{r.data["id"]}'
