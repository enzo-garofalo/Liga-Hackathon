"""Correção anônima: o avaliador vê o código, não a pessoa."""

import pytest
<<<<<<< HEAD
=======
from django.core.files.uploadedfile import SimpleUploadedFile
>>>>>>> feature/v3-processo-seletivo

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
<<<<<<< HEAD
    stage = StageFactory(process=process, order=1)
=======
    stage = StageFactory(process=process, order=1, anonymous_evaluation=True)
>>>>>>> feature/v3-processo-seletivo
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


<<<<<<< HEAD
def test_identity_is_visible_when_anonymity_is_off(
    evaluator_client, process, scenario
):
    """A Liga pode desligar o anonimato por processo."""
    process.anonymous_evaluation = False
    process.save()
=======
def test_identity_is_visible_when_the_stage_is_not_anonymous(
    evaluator_client, scenario
):
    """O anonimato é marca da etapa: desmarcada, o avaliador vê a pessoa."""
    stage = scenario['stage']
    stage.anonymous_evaluation = False
    stage.save(update_fields=['anonymous_evaluation'])
>>>>>>> feature/v3-processo-seletivo

    r = evaluator_client.get(detail_url(scenario['application'].id))
    assert r.data['participant_name'] == 'Ana Lima'


<<<<<<< HEAD
=======
def test_identity_appears_once_the_candidate_leaves_the_anonymous_stage(
    evaluator_client, process, scenario
):
    """Passada a etapa anônima, o avaliador volta a ver quem é.

    É o que a Liga quer: o anonimato serve para a correção do case, e no pitch
    e na entrevista o avaliador está olhando para a pessoa de qualquer jeito.
    """
    pitch = StageFactory(process=process, order=2, name='Pitch')
    application = scenario['application']
    application.current_stage = pitch
    application.save(update_fields=['current_stage'])
    StageAssignment.objects.create(
        stage=pitch, application=application, evaluator=evaluator_client.user
    )

    r = evaluator_client.get(detail_url(application.id))
    assert r.data['participant_name'] == 'Ana Lima'


>>>>>>> feature/v3-processo-seletivo
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
<<<<<<< HEAD
=======


# ── O nome do arquivo também é identidade ─────────────────────────


def test_the_filename_does_not_give_the_candidate_away(
    evaluator_client, candidate_client, process, settings, tmp_path
):
    """"case-pedro-xavier.pdf" derruba o anonimato sem ninguém perceber.

    Ninguém pensa no nome do arquivo como dado de identificação, e é por ali
    que o anonimato vaza primeiro: o avaliador lê o nome antes de abrir o PDF.
    """
    from apps.recruitment.models import Deliverable

    settings.MEDIA_ROOT = tmp_path
    stage = StageFactory(
        process=process, order=1, anonymous_evaluation=True, allows_file_upload=True
    )
    application = ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=stage,
        code='C-0042',
    )
    StageAssignment.objects.create(
        stage=stage, application=application, evaluator=evaluator_client.user
    )
    Deliverable.objects.create(
        application=application,
        stage=stage,
        file=SimpleUploadedFile('case-pedro-xavier.pdf', b'x' * 10),
    )

    r = evaluator_client.get(detail_url(application.id))

    nomes = [item['filename'] for item in r.data['deliverables']]
    assert nomes == ['C-0042.pdf']


def test_the_coordinator_sees_the_real_filename(
    admin_client, candidate_client, process, settings, tmp_path
):
    from apps.recruitment.models import Deliverable

    settings.MEDIA_ROOT = tmp_path
    stage = StageFactory(
        process=process, order=1, anonymous_evaluation=True, allows_file_upload=True
    )
    application = ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=stage,
        code='C-0042',
    )
    Deliverable.objects.create(
        application=application,
        stage=stage,
        file=SimpleUploadedFile('case-pedro-xavier.pdf', b'x' * 10),
    )

    r = admin_client.get(detail_url(application.id))

    assert 'case-pedro-xavier' in r.data['deliverables'][0]['filename']


def test_the_candidate_still_sees_their_own_filename(
    candidate_client, process, settings, tmp_path
):
    """O anonimato é regra entre organizadores.

    O candidato lendo o que ele mesmo enviou não é alcançado por ela: trocar o
    nome do arquivo dele pelo código seria só confusão, e o mesmo serializer
    atende as duas telas.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.recruitment.models import ProcessStatus

    settings.MEDIA_ROOT = tmp_path
    stage = StageFactory(
        process=process,
        order=1,
        anonymous_evaluation=True,
        allows_file_upload=True,
        max_files=1,
        allowed_file_types=['pdf'],
        start_at=timezone.now() - timedelta(days=1),
        end_at=timezone.now() + timedelta(days=5),
    )
    process.status = ProcessStatus.PUBLISHED
    process.save()
    application = ApplicationFactory(
        process=process,
        participant=candidate_client.participant,
        current_stage=stage,
        code='C-0042',
    )

    r = candidate_client.post(
        f'/api/v1/me/applications/{application.id}/deliverables/',
        {'file': SimpleUploadedFile('meu-case.pdf', b'x' * 10, content_type='application/pdf')},
        format='multipart',
    )

    assert r.status_code == 201
    assert 'meu-case' in r.data['filename']


def test_course_and_semester_are_hidden_too(evaluator_client, scenario):
    """Curso e semestre apontam para a pessoa numa comissão que a conhece.

    "Ciência da Computação, 8º período" sobra pouca gente. Anonimato que deixa
    pistas cruzáveis não é anonimato.
    """
    r = evaluator_client.get(detail_url(scenario['application'].id))

    assert r.data['course'] is None
    assert r.data['semester'] is None


def test_the_coordinator_still_sees_course_and_semester(admin_client, scenario):
    r = admin_client.get(detail_url(scenario['application'].id))

    assert r.data['course'] is not None


def test_the_sheet_says_it_is_anonymous(evaluator_client, scenario):
    """A tela precisa dizer que escondeu, senão parece cadastro incompleto."""
    r = evaluator_client.get(detail_url(scenario['application'].id))

    assert r.data['anonymous'] is True


def test_the_sheet_is_not_anonymous_for_the_coordinator(admin_client, scenario):
    r = admin_client.get(detail_url(scenario['application'].id))

    assert r.data['anonymous'] is False
>>>>>>> feature/v3-processo-seletivo
