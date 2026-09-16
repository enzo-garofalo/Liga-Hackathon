from io import StringIO

import pytest
from django.core.management import call_command

from apps.recruitment.models import (
    Application,
    Evaluation,
    EvaluationCriterion,
    Process,
    Stage,
)

pytestmark = pytest.mark.django_db


def counts():
    return {
        'processes': Process.objects.count(),
        'stages': Stage.objects.count(),
        'criteria': EvaluationCriterion.objects.count(),
        'applications': Application.objects.count(),
        'evaluations': Evaluation.objects.count(),
    }


def test_seed_creates_full_process():
    call_command('seed_recruitment_demo', stdout=StringIO())

    process = Process.objects.get()
    assert process.stages.count() == 4
    assert process.applications.count() == 7
    assert Evaluation.objects.exists()


def test_seed_is_idempotent():
    """Rodar duas vezes não pode duplicar nada — mesma regra do command de
    deadline do hackathon."""
    call_command('seed_recruitment_demo', stdout=StringIO())
    first = counts()

    call_command('seed_recruitment_demo', stdout=StringIO())
    assert counts() == first


def test_seed_clear_recreates_without_duplicating():
    call_command('seed_recruitment_demo', stdout=StringIO())
    first = counts()

    call_command('seed_recruitment_demo', '--clear', stdout=StringIO())
    assert counts() == first


def test_seed_does_not_send_email():
    """O seed cria candidaturas direto no banco. Disparar e-mail de
    confirmação para candidato fictício seria ruído — ou pior, e-mail real."""
    from django.core import mail

    mail.outbox.clear()
    call_command('seed_recruitment_demo', stdout=StringIO())
    assert mail.outbox == []
