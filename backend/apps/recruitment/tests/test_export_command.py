from io import StringIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.recruitment.models import Deliverable

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def with_deliverable(process, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / 'media'
    stage = StageFactory(process=process, order=1, name='Resolução do Case')
    application = ApplicationFactory(
        process=process, current_stage=stage, code='C-0001'
    )
    Deliverable.objects.create(
        application=application,
        stage=stage,
        file=SimpleUploadedFile('case.pdf', b'conteudo', content_type='application/pdf'),
    )
    return application


def test_export_writes_files_named_by_code(with_deliverable, process, tmp_path):
    out = tmp_path / 'export'
    call_command(
        'export_deliverables',
        '--process', process.name,
        '--out', str(out),
        stdout=StringIO(),
    )

    files = list(out.rglob('*.pdf'))
    assert len(files) == 1
    assert files[0].name.startswith('C-0001__')
    assert files[0].read_bytes() == b'conteudo'


def test_export_groups_by_stage(with_deliverable, process, tmp_path):
    out = tmp_path / 'export'
    call_command(
        'export_deliverables',
        '--process', process.name,
        '--out', str(out),
        stdout=StringIO(),
    )
    assert (out / 'resolucao_do_case').is_dir()


def test_export_requires_process(tmp_path):
    with pytest.raises(CommandError):
        call_command('export_deliverables', '--out', str(tmp_path), stdout=StringIO())


def test_export_reports_unknown_process(tmp_path):
    with pytest.raises(CommandError):
        call_command(
            'export_deliverables',
            '--process', 'nao existe',
            '--out', str(tmp_path),
            stdout=StringIO(),
        )


def test_export_warns_when_nothing_to_export(process, tmp_path):
    out = StringIO()
    call_command(
        'export_deliverables',
        '--process', process.name,
        '--out', str(tmp_path),
        stdout=out,
    )
    assert 'Nenhum entregável' in out.getvalue()
