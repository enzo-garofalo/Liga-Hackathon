"""Entrega de arquivos pelo candidato."""

from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.recruitment.models import Deliverable, ProcessStatus

from apps.recruitment.services.applications import move_to_stage, reject

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def url(application_id):
    return f'/api/v1/me/applications/{application_id}/deliverables/'


def detail_url(application_id, deliverable_id):
    return f'{url(application_id)}{deliverable_id}/'


def pdf(name='case.pdf', size=1024):
    return SimpleUploadedFile(name, b'x' * size, content_type='application/pdf')


@pytest.fixture
def scenario(process, candidate_client, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    stage = StageFactory(
        process=process,
        order=1,
        name='Resolução do Case',
        allows_file_upload=True,
        max_files=2,
        allowed_file_types=['pdf', 'zip'],
        start_at=timezone.now() - timedelta(days=2),
        end_at=timezone.now() + timedelta(days=5),
    )
    process.status = ProcessStatus.PUBLISHED
    process.save()
    application = ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=stage,
    )
    return {'stage': stage, 'application': application}


def test_upload_succeeds_within_deadline(candidate_client, scenario):
    r = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    assert r.status_code == 201
    assert r.data['filename'].endswith('.pdf')
    assert r.data['download_url'].endswith('/download/')
    assert Deliverable.objects.count() == 1


def test_upload_fails_when_stage_does_not_allow_files(candidate_client, scenario):
    scenario['stage'].allows_file_upload = False
    scenario['stage'].save()

    r = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    assert r.status_code == 400
    assert not Deliverable.objects.exists()


def test_upload_fails_with_disallowed_extension(candidate_client, scenario):
    r = candidate_client.post(
        url(scenario['application'].id),
        {'file': pdf(name='solucao.exe')},
        format='multipart',
    )
    assert r.status_code == 400
    assert 'pdf' in str(r.data)


def test_upload_fails_when_max_files_reached(candidate_client, scenario):
    for _ in range(2):
        candidate_client.post(
            url(scenario['application'].id), {'file': pdf()}, format='multipart'
        )

    r = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    assert r.status_code == 400
    assert Deliverable.objects.count() == 2


def test_upload_fails_after_stage_end(candidate_client, scenario):
    scenario['stage'].end_at = timezone.now() - timedelta(hours=1)
    scenario['stage'].save()

    r = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    assert r.status_code == 400
    assert 'prazo' in str(r.data).lower()


def test_upload_succeeds_after_end_when_late_submission_allowed(
    candidate_client, scenario
):
    scenario['stage'].end_at = timezone.now() - timedelta(hours=1)
    scenario['stage'].accepts_late_submission = True
    scenario['stage'].save()

    r = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    assert r.status_code == 201


def test_upload_fails_when_file_too_large(candidate_client, scenario, settings):
    settings.MAX_UPLOAD_BYTES = 500

    r = candidate_client.post(
        url(scenario['application'].id), {'file': pdf(size=2000)}, format='multipart'
    )
    assert r.status_code == 400
    assert 'MB' in str(r.data)


def test_upload_requires_a_file(candidate_client, scenario):
    r = candidate_client.post(url(scenario['application'].id), {}, format='multipart')
    assert r.status_code == 400


def test_upload_fails_for_other_participant(candidate_client, scenario, process):
    other = ApplicationFactory(process=process, current_stage=scenario['stage'])
    r = candidate_client.post(url(other.id), {'file': pdf()}, format='multipart')
    assert r.status_code == 403


def test_delete_deliverable_by_owner(candidate_client, scenario):
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = candidate_client.delete(
        detail_url(scenario['application'].id, created.data['id'])
    )
    assert r.status_code == 204
    assert not Deliverable.objects.exists()


def test_delete_deliverable_only_by_owner(
    candidate_client, evaluator_client, scenario
):
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = evaluator_client.delete(
        detail_url(scenario['application'].id, created.data['id'])
    )
    assert r.status_code in (403, 404)
    assert Deliverable.objects.count() == 1


def test_delete_deliverable_fails_after_deadline(candidate_client, scenario):
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    scenario['stage'].end_at = timezone.now() - timedelta(hours=1)
    scenario['stage'].save()

    r = candidate_client.delete(
        detail_url(scenario['application'].id, created.data['id'])
    )
    assert r.status_code == 400
    assert Deliverable.objects.count() == 1


def test_owner_can_download_own_file(candidate_client, scenario):
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = candidate_client.get(created.data['download_url'])
    assert r.status_code == 200


def test_evaluator_downloads_the_file_distributed_to_them(
    candidate_client, evaluator_client, scenario
):
    from apps.recruitment.models import StageAssignment

    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    StageAssignment.objects.create(
        stage=scenario['stage'],
        application=scenario['application'],
        evaluator=evaluator_client.user,
    )

    r = evaluator_client.get(created.data['download_url'])
    assert r.status_code == 200


def test_evaluator_cannot_download_outside_their_queue(
    candidate_client, evaluator_client, scenario
):
    """O arquivo é justamente o que se quer ver: liberar tudo a todo organizador
    deixaria a distribuição decorativa."""
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = evaluator_client.get(created.data['download_url'])
    assert r.status_code == 403


def test_coordinator_downloads_any_file(candidate_client, admin_client, scenario):
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = admin_client.get(created.data['download_url'])
    assert r.status_code == 200


def test_other_candidate_cannot_download(candidate_client, scenario, process):
    """Arquivo de candidatura não fica em URL pública."""
    from apps.teams.tests.factories import ParticipantFactory
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    intruder = ParticipantFactory()
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(intruder.user).access_token}'
    )

    r = client.get(created.data['download_url'])
    assert r.status_code == 403


def test_anonymous_cannot_download(client, candidate_client, scenario):
    created = candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )
    assert client.get(created.data['download_url']).status_code == 401


def test_deliverable_appears_in_application_timeline(candidate_client, scenario):
    candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = candidate_client.get(f'/api/v1/me/applications/{scenario["application"].id}/')
    current = [s for s in r.data['stages'] if s['state'] == 'current'][0]
    assert len(current['deliverables']) == 1
    assert current['deliverables'][0]['filename'].endswith('.pdf')


def test_deliverable_appears_in_admin_application_detail(
    admin_client, candidate_client, scenario
):
    candidate_client.post(
        url(scenario['application'].id), {'file': pdf()}, format='multipart'
    )

    r = admin_client.get(f'/api/v1/admin/applications/{scenario["application"].id}/')
    assert len(r.data['deliverables']) == 1
    assert r.data['deliverables'][0]['stage_name'] == 'Resolução do Case'


def test_upload_blocked_for_finished_application(candidate_client, scenario):
    application = scenario['application']
    application.status = 'rejected'
    application.save()

    r = candidate_client.post(url(application.id), {'file': pdf()}, format='multipart')
    assert r.status_code == 400


# ── A entrega sobrevive à mudança de etapa ────────────────────────
#
# O candidato precisa continuar podendo reler o que entregou depois de avançar.
# A tela só consegue mostrar isso se a API continuar devolvendo o arquivo na
# etapa antiga e liberando o download.


def test_deliverable_stays_on_the_stage_after_advancing(candidate_client, scenario):
    application = scenario['application']
    candidate_client.post(url(application.id), {'file': pdf()}, format='multipart')

    pitch = StageFactory(process=application.process, order=2, name='Pitch')
    move_to_stage(application, pitch)

    r = candidate_client.get(f'/api/v1/me/applications/{application.id}/')
    case = [s for s in r.data['stages'] if s['name'] == 'Resolução do Case'][0]
    assert case['state'] == 'done'
    assert len(case['deliverables']) == 1, 'a entrega sumiu ao mudar de etapa'


def test_owner_still_downloads_after_advancing(candidate_client, scenario):
    application = scenario['application']
    candidate_client.post(url(application.id), {'file': pdf()}, format='multipart')
    deliverable = Deliverable.objects.get()

    pitch = StageFactory(process=application.process, order=2, name='Pitch')
    move_to_stage(application, pitch)

    r = candidate_client.get(f'/api/v1/deliverables/{deliverable.id}/download/')
    assert r.status_code == 200


def test_owner_still_downloads_after_being_rejected(candidate_client, scenario):
    """Quem não passou também tem direito ao que escreveu."""
    application = scenario['application']
    candidate_client.post(url(application.id), {'file': pdf()}, format='multipart')
    deliverable = Deliverable.objects.get()

    reject(application)

    r = candidate_client.get(f'/api/v1/deliverables/{deliverable.id}/download/')
    assert r.status_code == 200
