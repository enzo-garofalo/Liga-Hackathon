import pytest
from django.core import mail

from apps.recruitment.models import ApplicationStatus, ProcessStatus
from apps.teams.models import Notification, NotificationType

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def url(process_id):
    return f'/api/v1/admin/processes/{process_id}/applications/bulk-action/'


@pytest.fixture
def scenario(process):
    first = StageFactory(process=process, order=1, name='Case')
    last = StageFactory(process=process, order=2, name='Entrevista')
    return {
        'first': first,
        'last': last,
        'in_first': ApplicationFactory(process=process, current_stage=first),
        'in_last': ApplicationFactory(process=process, current_stage=last),
    }


def move(applications, stage):
    return {
        'applications': [str(a) for a in applications],
        'action': 'move_stage',
        'target_stage': str(stage.id),
    }


def test_move_stage_updates_current_stage(admin_client, process, scenario):
    application = scenario['in_first']
    r = admin_client.post(
        url(process.id), move([application.id], scenario['last']), format='json'
    )
    assert r.status_code == 200
    application.refresh_from_db()
    assert application.current_stage_id == scenario['last'].id


def test_move_stage_sends_email_to_each_candidate(admin_client, process, scenario):
    mail.outbox.clear()
    r = admin_client.post(
        url(process.id),
        move([scenario['in_first'].id], scenario['last']),
        format='json',
    )
    assert r.status_code == 200
    assert len(mail.outbox) == 1
    assert 'Entrevista' in mail.outbox[0].subject


def test_move_stage_creates_notification(admin_client, process, scenario):
    admin_client.post(
        url(process.id),
        move([scenario['in_first'].id], scenario['last']),
        format='json',
    )
    assert Notification.objects.get().type == NotificationType.STAGE_ADVANCED


def test_move_stage_requires_target(admin_client, process, scenario):
    r = admin_client.post(
        url(process.id),
        {'applications': [str(scenario['in_first'].id)], 'action': 'move_stage'},
        format='json',
    )
    assert r.status_code == 400


def test_approve_fails_when_not_in_last_stage(admin_client, process, scenario):
    application = scenario['in_first']
    r = admin_client.post(
        url(process.id),
        {'applications': [str(application.id)], 'action': 'approve'},
        format='json',
    )
    assert r.status_code == 400
    application.refresh_from_db()
    assert application.status == ApplicationStatus.IN_PROGRESS


def test_approve_succeeds_in_last_stage(admin_client, process, scenario):
    application = scenario['in_last']
    mail.outbox.clear()

    r = admin_client.post(
        url(process.id),
        {'applications': [str(application.id)], 'action': 'approve'},
        format='json',
    )
    assert r.status_code == 200
    application.refresh_from_db()
    assert application.status == ApplicationStatus.APPROVED
    assert len(mail.outbox) == 1
    assert 'aprovado' in mail.outbox[0].subject.lower()


def test_reject_sets_status_and_sends_email(admin_client, process, scenario):
    application = scenario['in_first']
    mail.outbox.clear()

    r = admin_client.post(
        url(process.id),
        {'applications': [str(application.id)], 'action': 'reject'},
        format='json',
    )
    assert r.status_code == 200
    application.refresh_from_db()
    assert application.status == ApplicationStatus.REJECTED
    assert len(mail.outbox) == 1
    assert Notification.objects.get().type == NotificationType.APPLICATION_REJECTED


def test_discard_does_not_send_email(admin_client, process, scenario):
    application = scenario['in_first']
    mail.outbox.clear()

    r = admin_client.post(
        url(process.id),
        {'applications': [str(application.id)], 'action': 'discard'},
        format='json',
    )
    assert r.status_code == 200
    application.refresh_from_db()
    assert application.status == ApplicationStatus.DISCARDED
    assert mail.outbox == []
    assert not Notification.objects.exists()


def test_bulk_action_fails_on_finished_application(admin_client, process, scenario):
    application = scenario['in_first']
    application.status = ApplicationStatus.REJECTED
    application.save()

    r = admin_client.post(
        url(process.id), move([application.id], scenario['last']), format='json'
    )
    assert r.status_code == 400


def test_bulk_action_is_all_or_nothing(admin_client, process, scenario):
    """Uma candidatura inválida cancela a ação inteira.

    Aplicar parcialmente deixaria o organizador sem saber quem foi movido e
    quem não foi.
    """
    finished = scenario['in_last']
    finished.status = ApplicationStatus.APPROVED
    finished.save()
    movable = scenario['in_first']

    r = admin_client.post(
        url(process.id),
        move([movable.id, finished.id], scenario['last']),
        format='json',
    )
    assert r.status_code == 400
    movable.refresh_from_db()
    assert movable.current_stage_id == scenario['first'].id


def test_bulk_action_applies_to_several_candidates(admin_client, process, scenario):
    extra = ApplicationFactory(process=process, current_stage=scenario['first'])
    mail.outbox.clear()

    r = admin_client.post(
        url(process.id),
        move([scenario['in_first'].id, extra.id], scenario['last']),
        format='json',
    )
    assert r.status_code == 200
    assert r.data['updated'] == 2
    assert len(mail.outbox) == 2


def test_bulk_action_blocked_on_closed_process(admin_client, process, scenario):
    process.status = ProcessStatus.CLOSED
    process.save()

    r = admin_client.post(
        url(process.id),
        {'applications': [str(scenario['in_first'].id)], 'action': 'reject'},
        format='json',
    )
    assert r.status_code == 400


def test_unknown_action_is_rejected(admin_client, process, scenario):
    r = admin_client.post(
        url(process.id),
        {'applications': [str(scenario['in_first'].id)], 'action': 'explodir'},
        format='json',
    )
    assert r.status_code == 400


def test_candidate_cannot_run_bulk_action(candidate_client, process, scenario):
    r = candidate_client.post(
        url(process.id),
        {'applications': [str(scenario['in_first'].id)], 'action': 'reject'},
        format='json',
    )
    assert r.status_code == 403
