import pytest

from .factories import ProcessFactory, StageFactory


@pytest.fixture(autouse=True)
def email_locmem(settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


@pytest.fixture
def process(db):
    return ProcessFactory()


@pytest.fixture
def stage(process):
    return StageFactory(process=process, order=1)
