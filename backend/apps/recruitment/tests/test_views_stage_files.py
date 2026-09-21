"""Enunciado em PDF anexado à etapa.

O organizador anexa; o candidato baixa, mas só depois de chegar na etapa. Essa
última parte é o ponto: o arquivo é a prova, e abrir antes da hora daria dias
de vantagem a quem soubesse montar a URL.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.recruitment.models import ApplicationStatus, ProcessStatus

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def admin_url(stage_id):
    return f'/api/v1/admin/stages/{stage_id}/instructions-file/'


def download_url(stage_id):
    return f'/api/v1/stages/{stage_id}/instructions-file/download/'


def pdf(name='enunciado.pdf', size=512):
    return SimpleUploadedFile(name, b'%PDF-1.4' + b'x' * size, content_type='application/pdf')


@pytest.fixture
def cenario(process, candidate_client, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    inscricao = StageFactory(process=process, order=1, name='Inscrição')
    case = StageFactory(process=process, order=2, name='Resolução do Case')
    process.status = ProcessStatus.PUBLISHED
    process.save(update_fields=['status'])
    application = ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=inscricao,
    )
    return {'inscricao': inscricao, 'case': case, 'application': application}


# ── Organizador ───────────────────────────────────────────────────


def test_organizer_attaches_the_pdf(admin_client, cenario):
    r = admin_client.post(admin_url(cenario['case'].id), {'file': pdf()}, format='multipart')

    assert r.status_code == 200
    assert r.data['instructions_file_name'].endswith('.pdf')
    assert r.data['instructions_file_url']
    cenario['case'].refresh_from_db()
    assert cenario['case'].instructions_file


def test_replacing_the_pdf_removes_the_old_file(admin_client, cenario):
    """Sem isso, cada troca de enunciado deixaria uma cópia órfã no volume."""
    admin_client.post(admin_url(cenario['case'].id), {'file': pdf('antigo.pdf')}, format='multipart')
    cenario['case'].refresh_from_db()
    antigo = cenario['case'].instructions_file.path

    admin_client.post(admin_url(cenario['case'].id), {'file': pdf('novo.pdf')}, format='multipart')
    cenario['case'].refresh_from_db()

    import os

    assert not os.path.exists(antigo)
    assert 'novo' in cenario['case'].instructions_file.name


def test_organizer_removes_the_pdf(admin_client, cenario):
    admin_client.post(admin_url(cenario['case'].id), {'file': pdf()}, format='multipart')

    r = admin_client.delete(admin_url(cenario['case'].id))

    assert r.status_code == 200
    assert r.data['instructions_file_name'] == ''
    cenario['case'].refresh_from_db()
    assert not cenario['case'].instructions_file


def test_only_pdf_is_accepted(admin_client, cenario):
    docx = SimpleUploadedFile('enunciado.docx', b'x' * 10, content_type='application/msword')

    r = admin_client.post(admin_url(cenario['case'].id), {'file': docx}, format='multipart')

    assert r.status_code == 400
    assert 'PDF' in str(r.data)


def test_upload_respects_the_size_limit(admin_client, cenario, settings):
    settings.MAX_UPLOAD_BYTES = 100

    r = admin_client.post(
        admin_url(cenario['case'].id), {'file': pdf(size=500)}, format='multipart'
    )

    assert r.status_code == 400


def test_candidate_cannot_attach_a_pdf(candidate_client, cenario):
    r = candidate_client.post(
        admin_url(cenario['case'].id), {'file': pdf()}, format='multipart'
    )
    assert r.status_code == 403


# ── Candidato ─────────────────────────────────────────────────────


def test_candidate_downloads_the_pdf_of_the_stage_reached(
    admin_client, candidate_client, cenario
):
    admin_client.post(admin_url(cenario['inscricao'].id), {'file': pdf()}, format='multipart')

    r = candidate_client.get(download_url(cenario['inscricao'].id))

    assert r.status_code == 200


def test_candidate_cannot_download_the_pdf_of_a_later_stage(
    admin_client, candidate_client, cenario
):
    """O enunciado do case não abre enquanto o candidato está na inscrição."""
    admin_client.post(admin_url(cenario['case'].id), {'file': pdf()}, format='multipart')

    r = candidate_client.get(download_url(cenario['case'].id))

    assert r.status_code == 403


def test_candidate_downloads_after_advancing(admin_client, candidate_client, cenario):
    admin_client.post(admin_url(cenario['case'].id), {'file': pdf()}, format='multipart')
    application = cenario['application']
    application.current_stage = cenario['case']
    application.save(update_fields=['current_stage'])

    r = candidate_client.get(download_url(cenario['case'].id))

    assert r.status_code == 200


def test_candidate_still_downloads_after_the_stage_passed(
    admin_client, candidate_client, cenario
):
    """Etapa já corrigida continua à mão, como a própria entrega."""
    admin_client.post(admin_url(cenario['inscricao'].id), {'file': pdf()}, format='multipart')
    application = cenario['application']
    application.current_stage = cenario['case']
    application.save(update_fields=['current_stage'])

    r = candidate_client.get(download_url(cenario['inscricao'].id))

    assert r.status_code == 200


def test_candidate_of_another_process_cannot_download(admin_client, candidate_client, cenario):
    admin_client.post(admin_url(cenario['inscricao'].id), {'file': pdf()}, format='multipart')
    cenario['application'].delete()

    r = candidate_client.get(download_url(cenario['inscricao'].id))

    assert r.status_code == 403


def test_anonymous_cannot_download(client, admin_client, cenario):
    admin_client.post(admin_url(cenario['inscricao'].id), {'file': pdf()}, format='multipart')

    r = client.get(download_url(cenario['inscricao'].id))

    assert r.status_code == 401


def test_organizer_downloads_any_stage(admin_client, cenario):
    admin_client.post(admin_url(cenario['case'].id), {'file': pdf()}, format='multipart')

    r = admin_client.get(download_url(cenario['case'].id))

    assert r.status_code == 200


def test_download_of_stage_without_file_is_404(admin_client, cenario):
    r = admin_client.get(download_url(cenario['case'].id))
    assert r.status_code == 404


# ── O que a linha do tempo do candidato mostra ────────────────────


def test_timeline_hides_the_pdf_of_a_later_stage(admin_client, candidate_client, cenario):
    """Nem o nome do arquivo sai antes da hora: o nome entrega o tema."""
    admin_client.post(
        admin_url(cenario['case'].id), {'file': pdf('case-fintech.pdf')}, format='multipart'
    )

    r = candidate_client.get(f'/api/v1/me/applications/{cenario["application"].id}/')

    case = [s for s in r.data['stages'] if s['name'] == 'Resolução do Case'][0]
    assert case['state'] == 'upcoming'
    assert case['instructions_file'] is None
    assert 'fintech' not in str(r.data)


def test_timeline_shows_the_pdf_of_the_stage_reached(
    admin_client, candidate_client, cenario
):
    admin_client.post(admin_url(cenario['inscricao'].id), {'file': pdf()}, format='multipart')

    r = candidate_client.get(f'/api/v1/me/applications/{cenario["application"].id}/')

    inscricao = [s for s in r.data['stages'] if s['name'] == 'Inscrição'][0]
    assert inscricao['instructions_file']['filename'].endswith('.pdf')
    assert inscricao['instructions_file']['download_url'].endswith('/download/')


def test_stage_without_pdf_reports_none(candidate_client, cenario):
    r = candidate_client.get(f'/api/v1/me/applications/{cenario["application"].id}/')

    inscricao = [s for s in r.data['stages'] if s['name'] == 'Inscrição'][0]
    assert inscricao['instructions_file'] is None


def test_finished_application_still_sees_the_pdf(admin_client, candidate_client, cenario):
    admin_client.post(admin_url(cenario['inscricao'].id), {'file': pdf()}, format='multipart')
    application = cenario['application']
    application.status = ApplicationStatus.REJECTED
    application.save(update_fields=['status'])

    r = candidate_client.get(f'/api/v1/me/applications/{application.id}/')

    inscricao = [s for s in r.data['stages'] if s['name'] == 'Inscrição'][0]
    assert inscricao['instructions_file'] is not None
