from datetime import timedelta

import pytest
from django.utils import timezone

from apps.recruitment.models import Process, ProcessStatus

from .factories import ApplicationFactory, ProcessFactory, StageFactory

pytestmark = pytest.mark.django_db

URL = '/api/v1/admin/processes/'


def detail_url(process_id, suffix=''):
    return f'{URL}{process_id}/{suffix}'


def payload(**overrides):
    start = timezone.now() + timedelta(days=1)
    data = {
        'name': 'Processo Seletivo 2026.2',
        'description': 'Venha fazer parte da Liga.',
        'registration_start': start.isoformat(),
        'registration_end': (start + timedelta(days=14)).isoformat(),
    }
    data.update(overrides)
    return data


def test_list_requires_staff(candidate_client):
    assert candidate_client.get(URL).status_code == 403


def test_list_requires_authentication(client):
    assert client.get(URL).status_code == 401


def test_create_process_as_draft(admin_client):
    r = admin_client.post(URL, payload(), format='json')
    assert r.status_code == 201
    assert r.data['status'] == ProcessStatus.DRAFT
    assert r.data['published_at'] is None


def test_create_process_published_sets_published_at(admin_client):
    r = admin_client.post(
        URL, payload(status=ProcessStatus.PUBLISHED), format='json'
    )
    assert r.status_code == 201
    assert r.data['published_at'] is not None


def test_create_fails_when_end_before_start(admin_client):
    start = timezone.now() + timedelta(days=10)
    r = admin_client.post(
        URL,
        payload(
            registration_start=start.isoformat(),
            registration_end=(start - timedelta(days=5)).isoformat(),
        ),
        format='json',
    )
    assert r.status_code == 400


def test_publish_fails_without_stages(admin_client, process):
    r = admin_client.post(detail_url(process.id, 'publish/'))
    assert r.status_code == 400
    process.refresh_from_db()
    assert process.status == ProcessStatus.DRAFT


def test_publish_succeeds_with_stage(admin_client, process):
    StageFactory(process=process, order=1)
    r = admin_client.post(detail_url(process.id, 'publish/'))
    assert r.status_code == 200
    process.refresh_from_db()
    assert process.status == ProcessStatus.PUBLISHED
    assert process.published_at is not None


def test_publish_accepts_highlight_message(admin_client, process):
    StageFactory(process=process, order=1)
    r = admin_client.post(
        detail_url(process.id, 'publish/'),
        {'highlight_message': 'Inscrições abertas!'},
        format='json',
    )
    assert r.status_code == 200
    process.refresh_from_db()
    assert process.highlight_message == 'Inscrições abertas!'


def test_publish_fails_when_not_draft(admin_client, process):
    StageFactory(process=process, order=1)
    admin_client.post(detail_url(process.id, 'publish/'))
    r = admin_client.post(detail_url(process.id, 'publish/'))
    assert r.status_code == 400


def test_delete_allowed_only_for_draft(admin_client, process):
    StageFactory(process=process, order=1)
    assert admin_client.delete(detail_url(process.id)).status_code == 204

    published = ProcessFactory(status=ProcessStatus.PUBLISHED)
    r = admin_client.delete(detail_url(published.id))
    assert r.status_code == 400
    assert Process.objects.filter(id=published.id).exists()


def test_close_blocks_edits(admin_client, process):
    StageFactory(process=process, order=1)
    admin_client.post(detail_url(process.id, 'publish/'))
    assert admin_client.post(detail_url(process.id, 'close/')).status_code == 200

    r = admin_client.patch(
        detail_url(process.id), {'name': 'Outro nome'}, format='json'
    )
    assert r.status_code == 400


def test_close_fails_for_draft(admin_client, process):
    assert admin_client.post(detail_url(process.id, 'close/')).status_code == 400


def test_detail_returns_correct_stats(admin_client, process):
    stage = StageFactory(process=process, order=1)
    ApplicationFactory(process=process, current_stage=stage)
    ApplicationFactory(process=process, current_stage=stage, status='approved')
    ApplicationFactory(process=process, current_stage=stage, status='rejected')

    r = admin_client.get(detail_url(process.id))
    assert r.status_code == 200
    assert r.data['stats'] == {
        'total': 3,
        'in_progress': 1,
        'approved': 1,
        'rejected': 1,
        'discarded': 0,
<<<<<<< HEAD
=======
        'withdrawn': 0,
>>>>>>> feature/v3-processo-seletivo
    }
