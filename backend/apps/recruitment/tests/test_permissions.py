"""Revisão de permissões dos endpoints do seletivo.

Dois riscos diferentes, testados separadamente:

- **Quem não é organizador** chegando em `/admin/` — coberto de forma varrida,
  percorrendo o URLconf, para que endpoint novo entre no teste sozinho.
- **Candidato logado** alcançando dado de outro candidato. Autenticado não é o
  mesmo que autorizado, e é aqui que vaza material de candidatura.
"""

<<<<<<< HEAD
=======
import re
>>>>>>> feature/v3-processo-seletivo
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.recruitment.models import Deliverable, ProcessStatus
from apps.recruitment.urls import urlpatterns

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def admin_urls():
    """Toda rota `/admin/` do app, com os parâmetros preenchidos."""
    rotas = []
    for pattern in urlpatterns:
        template = str(pattern.pattern)
        if not template.startswith('admin/'):
            continue
<<<<<<< HEAD
        url = '/api/v1/' + template
        url = url.replace('<uuid:pk>', str(uuid.uuid4()))
        url = url.replace('<uuid:deliverable_id>', str(uuid.uuid4()))
        url = url.replace('<int:pk>', '1')
=======
        # Preenche por tipo, e não pelo nome do parâmetro: rota nova com um
        # nome que ninguém previu entra na varredura sozinha, que é o motivo
        # de a varredura existir.
        url = re.sub(r'<uuid:[^>]+>', lambda _: str(uuid.uuid4()), '/api/v1/' + template)
        url = re.sub(r'<int:[^>]+>', '1', url)
>>>>>>> feature/v3-processo-seletivo
        rotas.append(url)
    return rotas


def test_the_sweep_actually_found_the_admin_routes():
    """Contraprova: uma varredura vazia passaria em tudo sem testar nada."""
    rotas = admin_urls()
    assert len(rotas) >= 15
    assert all('/api/v1/admin/' in rota for rota in rotas)
    assert not any('<' in rota for rota in rotas)


def test_candidate_cannot_reach_any_admin_endpoint(candidate_client):
    """Permissão é checada antes do método, então GET serve para varrer."""
    negados = []
    for rota in admin_urls():
        resposta = candidate_client.get(rota)
        if resposta.status_code != 403:
            negados.append((rota, resposta.status_code))
    assert negados == []


def test_anonymous_cannot_reach_any_admin_endpoint():
    anonimo = APIClient()
    negados = []
    for rota in admin_urls():
        resposta = anonimo.get(rota)
        if resposta.status_code != 401:
            negados.append((rota, resposta.status_code))
    assert negados == []


# ── Candidato logado x candidatura alheia ─────────────────────────


@pytest.fixture
def outra_candidatura(process):
    """Candidatura de outra pessoa, com um entregável dela."""
    process.status = ProcessStatus.PUBLISHED
    process.save()
    stage = StageFactory(process=process, order=1, allows_file_upload=True)
    application = ApplicationFactory(process=process, current_stage=stage)
    deliverable = Deliverable.objects.create(
        application=application,
        stage=stage,
        file=SimpleUploadedFile('case.pdf', b'conteudo', content_type='application/pdf'),
    )
    return application, deliverable


def test_candidate_cannot_open_someone_elses_application(
    candidate_client, outra_candidatura
):
    application, _ = outra_candidatura
    r = candidate_client.get(f'/api/v1/me/applications/{application.id}/')
    assert r.status_code == 404


def test_candidate_cannot_download_someone_elses_file(
    candidate_client, outra_candidatura
):
    """O arquivo é o trabalho da pessoa: autenticado não basta, tem que ser dela."""
    _, deliverable = outra_candidatura
    r = candidate_client.get(f'/api/v1/deliverables/{deliverable.id}/download/')
    assert r.status_code == 403


def test_candidate_cannot_delete_someone_elses_file(
    candidate_client, outra_candidatura
):
    application, deliverable = outra_candidatura
    r = candidate_client.delete(
        f'/api/v1/me/applications/{application.id}/deliverables/{deliverable.id}/'
    )
    assert r.status_code in (403, 404)


def test_candidate_cannot_upload_into_someone_elses_application(
    candidate_client, outra_candidatura
):
    application, _ = outra_candidatura
    r = candidate_client.post(
        f'/api/v1/me/applications/{application.id}/deliverables/', {}, format='multipart'
    )
    assert r.status_code in (403, 404)


def test_organizer_can_download_any_file(admin_client, outra_candidatura):
    """Contraprova da regra acima: organizador corrige, então baixa."""
    _, deliverable = outra_candidatura
    r = admin_client.get(f'/api/v1/deliverables/{deliverable.id}/download/')
    assert r.status_code == 200
