"""Fixtures compartilhadas por todos os apps.

Cada fixture aqui corrige uma armadilha do ambiente de teste que fazia testes
corretos falharem. Todas são autouse: valem para a suíte inteira.
"""

from datetime import timedelta

import pytest
from django.utils import timezone


@pytest.fixture(autouse=True)
def immediate_on_commit(monkeypatch):
    """Executa os callbacks de transaction.on_commit imediatamente.

    O pytest-django roda cada teste dentro de uma transação que sofre rollback
    no fim, então callbacks registrados via transaction.on_commit nunca são
    executados. Como notify() enfileira o e-mail dentro de um on_commit, todo
    teste que verifica mail.outbox falhava mesmo com o código correto.
    """
    monkeypatch.setattr(
        'django.db.transaction.on_commit',
        lambda func, using=None, robust=False: func(),
    )


@pytest.fixture(autouse=True)
def celery_eager():
    """Roda as tasks Celery no próprio processo, sem precisar de broker.

    Sem isto, o .delay() disparado pelo on_commit tentaria conectar no Redis,
    que não sobe em ambiente de teste (nem existe no docker-compose).
    """
    from core.celery import app

    app.conf.task_always_eager = True
    app.conf.task_eager_propagates = True


@pytest.fixture(autouse=True)
def team_deadline_in_future(settings):
    """Mantém o TEAM_DEADLINE no futuro durante os testes.

    O valor padrão (2026-05-30) já passou, e o backend bloqueia criação e
    submissão de equipe depois do prazo — o que quebrava testes que não têm
    nada a ver com deadline. Os testes de prazo sobrescrevem este valor dentro
    do próprio teste, então continuam válidos.
    """
    settings.TEAM_DEADLINE = timezone.localdate() + timedelta(days=30)
