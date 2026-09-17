"""Prazos exibidos no fuso da Liga, nunca em UTC.

O banco guarda em UTC. Um prazo às 23:59 de Brasília é 02:59 do dia seguinte em
UTC — sem conversão, o candidato leria horário e até dia errados.
"""

from datetime import datetime, timezone as dt_timezone

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError

from apps.recruitment.emails import _date
from apps.recruitment.models import ProcessStatus
from apps.recruitment.services.deliverables import assert_upload_allowed

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db

# 25/08/2026 23:59 em Brasília (UTC-3) == 26/08/2026 02:59 em UTC
DEADLINE_UTC = datetime(2026, 8, 26, 2, 59, tzinfo=dt_timezone.utc)


def test_email_date_uses_local_day():
    """Em UTC seria 26/08 — um dia a mais do que o candidato realmente tem."""
    assert _date(DEADLINE_UTC) == '25/08'


def test_email_date_handles_missing_value():
    assert _date(None) == 'a definir'


def test_deadline_message_uses_local_time(process):
    process.status = ProcessStatus.PUBLISHED
    process.save()
    stage = StageFactory(
        process=process,
        order=1,
        allows_file_upload=True,
        allowed_file_types=['pdf'],
        end_at=DEADLINE_UTC,
    )
    application = ApplicationFactory(process=process, current_stage=stage)
    pdf = SimpleUploadedFile('case.pdf', b'x', content_type='application/pdf')

    with pytest.raises(ValidationError) as error:
        assert_upload_allowed(application, stage, pdf)

    message = str(error.value.detail)
    assert '25/08/2026 às 23:59' in message
    assert '02:59' not in message
