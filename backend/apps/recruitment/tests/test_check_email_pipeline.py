"""O comando existe para pegar a falha silenciosa: fila sem worker."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

pytestmark = pytest.mark.django_db


def run(**kwargs):
    out = StringIO()
    try:
        call_command('check_email_pipeline', stdout=out, stderr=out, **kwargs)
        return out.getvalue(), 0
    except SystemExit as exit_error:
        return out.getvalue(), exit_error.code


def test_fails_when_no_worker_responds():
    with patch('celery.app.control.Control.ping', return_value=[]):
        output, code = run()

    assert code == 1
    assert 'nenhum worker respondeu' in output


def test_passes_when_worker_responds():
    with patch(
        'celery.app.control.Control.ping', return_value=[{'celery@host': {'ok': 'pong'}}]
    ), patch('kombu.connection.Connection.ensure_connection', return_value=None):
        output, code = run()

    assert code == 0
    assert 'operacional' in output


def test_reports_unreachable_broker():
    with patch(
        'kombu.connection.Connection.ensure_connection',
        side_effect=ConnectionRefusedError('sem redis'),
    ), patch('celery.app.control.Control.ping', return_value=[{'w': {}}]):
        output, code = run()

    assert code == 1
    assert 'broker inacessível' in output


def test_warns_about_eager_mode(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    with patch(
        'celery.app.control.Control.ping', return_value=[{'celery@host': {'ok': 'pong'}}]
    ), patch('kombu.connection.Connection.ensure_connection', return_value=None):
        output, _ = run()

    assert 'eager' in output.lower()


def test_lists_registered_notification_types():
    with patch(
        'celery.app.control.Control.ping', return_value=[{'celery@host': {'ok': 'pong'}}]
    ), patch('kombu.connection.Connection.ensure_connection', return_value=None):
        output, _ = run()

    assert 'tipos de notificação com task registrada' in output
