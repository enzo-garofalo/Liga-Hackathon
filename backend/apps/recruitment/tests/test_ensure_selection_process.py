from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.recruitment.blueprint import PROCESS_NAME, STAGES
from apps.recruitment.models import (
    EvaluationCriterion,
    Process,
    ProcessStatus,
    Stage,
)

pytestmark = pytest.mark.django_db


def run(*args):
    out = StringIO()
    call_command('ensure_selection_process', *args, stdout=out)
    return out.getvalue()


def test_creates_the_process_with_every_stage_and_criterion():
    run()

    process = Process.objects.get(name=PROCESS_NAME)
    assert process.stages.count() == len(STAGES)

    for order, data in enumerate(STAGES, start=1):
        stage = process.stages.get(order=order)
        assert stage.name == data['name']
        assert stage.weight == data['weight']
        assert stage.criteria.count() == len(data['criteria'])


def test_process_is_born_without_anonymous_marking():
    """Decisão da Liga: todo organizador vê a identidade do candidato.

    O mecanismo de anonimato continua no código; religar é marcar o campo.
    """
    run()
    assert Process.objects.get(name=PROCESS_NAME).anonymous_evaluation is False


def test_process_is_born_as_draft():
    """Publicar abre inscrições para gente real — não pode ser efeito de deploy."""
    run()

    process = Process.objects.get(name=PROCESS_NAME)
    assert process.status == ProcessStatus.DRAFT
    assert process.published_at is None


def test_running_again_changes_nothing():
    run()
    process = Process.objects.get(name=PROCESS_NAME)
    before = (process.id, process.registration_end, Stage.objects.count())

    output = run()

    process.refresh_from_db()
    assert (process.id, process.registration_end, Stage.objects.count()) == before
    assert EvaluationCriterion.objects.count() == sum(
        len(data['criteria']) for data in STAGES
    )
    assert 'nada a fazer' in output


def test_does_not_overwrite_what_the_organizer_changed():
    """O comando roda a cada deploy. Resetar as datas desfaria o ajuste dele."""
    run()
    process = Process.objects.get(name=PROCESS_NAME)
    new_end = timezone.now() + timedelta(days=90)
    process.registration_end = new_end
    process.status = ProcessStatus.PUBLISHED
    process.save()

    stage = process.stages.get(order=2)
    stage.name = 'Case adaptado'
    stage.weight = 50
    stage.save()

    run()

    process.refresh_from_db()
    stage.refresh_from_db()
    assert process.registration_end == new_end
    assert process.status == ProcessStatus.PUBLISHED
    assert stage.name == 'Case adaptado'
    assert stage.weight == 50


def test_stages_run_in_sequence_without_gaps():
    run()

    stages = list(Process.objects.get(name=PROCESS_NAME).stages.order_by('order'))
    for previous, following in zip(stages, stages[1:]):
        assert following.start_at == previous.end_at
        assert following.end_at > following.start_at


def test_weights_add_up_to_one_hundred():
    """Barema torto só aparece na hora de fechar nota, quando já é tarde."""
    run()

    process = Process.objects.get(name=PROCESS_NAME)
    assert sum(stage.weight for stage in process.stages.all()) == 100

    for stage in process.stages.all():
        criteria = list(stage.criteria.all())
        if criteria:
            assert sum(c.weight for c in criteria) == 100, stage.name


def test_file_upload_only_on_the_case_stage():
    run()

    process = Process.objects.get(name=PROCESS_NAME)
    uploads = [s.name for s in process.stages.filter(allows_file_upload=True)]
    assert uploads == ['Resolução do Case']

    case = process.stages.get(name='Resolução do Case')
    assert case.allowed_file_types == ['pdf']
    assert case.max_files == 1


def test_custom_name_creates_a_separate_process():
    run()
    run('--name', 'Processo Seletivo 2027.1')

    assert Process.objects.count() == 2
    assert Process.objects.filter(name='Processo Seletivo 2027.1').exists()
