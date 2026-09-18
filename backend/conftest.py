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
def celery_eager(settings):
    """Roda as tasks Celery no próprio processo, sem broker nem Redis.

    Precisa mexer no settings do Django e forçar o Celery a reler: atribuir
    direto em `app.conf` não gruda, porque o Celery resolve a configuração a
    partir de `django.conf:settings` e o valor de lá vence. O broker e o
    backend de resultado também vão para memória — senão o Celery tenta gravar
    o resultado no Redis e o erro real fica escondido atrás de 20 tentativas de
    reconexão.
    """
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.CELERY_BROKER_URL = 'memory://'
    settings.CELERY_RESULT_BACKEND = 'cache+memory://'

    from core.celery import app

    app.config_from_object('django.conf:settings', namespace='CELERY', force=True)


@pytest.fixture(autouse=True)
def team_deadline_in_future(settings):
    """Mantém o TEAM_DEADLINE no futuro durante os testes.

    O valor padrão (2026-05-30) já passou, e o backend bloqueia criação e
    submissão de equipe depois do prazo — o que quebrava testes que não têm
    nada a ver com deadline. Os testes de prazo sobrescrevem este valor dentro
    do próprio teste, então continuam válidos.
    """
    settings.TEAM_DEADLINE = timezone.localdate() + timedelta(days=30)


@pytest.fixture(autouse=True)
def media_root_isolado(settings, tmp_path):
    """Cada teste escreve arquivo no seu próprio diretório temporário.

    Sem isto, todo teste que envia entregável deixa PDF em `backend/media/`, que
    é o MEDIA_ROOT de desenvolvimento. O lixo se acumula a cada rodada e fica
    perto de virar commit acidental de material de candidatura.
    """
    settings.MEDIA_ROOT = str(tmp_path / 'media')
