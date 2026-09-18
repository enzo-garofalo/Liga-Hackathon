"""Endpoint aberto que alimenta a landing com o período de inscrições."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.recruitment.models import ProcessStatus

from .factories import ProcessFactory, StageFactory

pytestmark = pytest.mark.django_db

URL = '/api/v1/open-process/'


@pytest.fixture
def anonymous():
    return APIClient()


def test_anonymous_sees_the_registration_window(anonymous, process):
    """Quem lê a home ainda não tem conta: o endpoint precisa ser aberto."""
    process.status = ProcessStatus.PUBLISHED
    process.save()

    r = anonymous.get(URL)
    assert r.status_code == 200
    assert r.data['registration_start'] is not None
    assert r.data['registration_end'] is not None


def test_returns_null_without_a_published_process(anonymous, process):
    """Rascunho não é processo aberto — a landing omite as datas em vez de mentir."""
    process.status = ProcessStatus.DRAFT
    process.save()

    r = anonymous.get(URL)
    assert r.status_code == 200
    assert r.data is None


def test_closed_process_is_not_announced(anonymous, process):
    process.status = ProcessStatus.CLOSED
    process.save()

    r = anonymous.get(URL)
    assert r.data is None


def test_exposes_only_name_and_dates(anonymous, process):
    """Endpoint aberto não pode carregar configuração de avaliação."""
    process.status = ProcessStatus.PUBLISHED
    process.save()
    StageFactory(process=process, order=1)

    r = anonymous.get(URL)
    assert set(r.data.keys()) == {
        'name',
        'registration_start',
        'registration_end',
        'registration_open',
    }
    for vazado in ('score_min', 'score_max', 'divergence_threshold', 'stages', 'id'):
        assert vazado not in r.data


def test_registration_open_reflects_the_window(anonymous, process):
    now = timezone.now()
    process.status = ProcessStatus.PUBLISHED
    process.registration_start = now - timedelta(days=1)
    process.registration_end = now + timedelta(days=1)
    process.save()
    assert anonymous.get(URL).data['registration_open'] is True

    process.registration_end = now - timedelta(hours=1)
    process.save()
    assert anonymous.get(URL).data['registration_open'] is False


def test_picks_the_process_that_starts_first(anonymous, process):
    """Com mais de um publicado, a landing anuncia um só — de forma previsível."""
    now = timezone.now()
    process.status = ProcessStatus.PUBLISHED
    process.name = 'Primeiro'
    process.registration_start = now
    process.registration_end = now + timedelta(days=10)
    process.save()

    ProcessFactory(
        name='Segundo',
        status=ProcessStatus.PUBLISHED,
        registration_start=now + timedelta(days=30),
        registration_end=now + timedelta(days=40),
    )

    assert anonymous.get(URL).data['name'] == 'Primeiro'
