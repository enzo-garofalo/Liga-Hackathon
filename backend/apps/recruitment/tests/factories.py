from datetime import timedelta

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.recruitment.models import (
    Application,
    EvaluationCriterion,
    Evaluation,
    Process,
    ProcessStatus,
    Stage,
)
from apps.teams.tests.factories import ParticipantFactory, UserFactory


class ProcessFactory(DjangoModelFactory):
    class Meta:
        model = Process

    name = factory.Sequence(lambda n: f'Processo Seletivo {n}')
    description = 'Descrição padrão para testes.'
    status = ProcessStatus.DRAFT
    registration_start = factory.LazyFunction(lambda: timezone.now() - timedelta(days=1))
    registration_end = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))


class StageFactory(DjangoModelFactory):
    class Meta:
        model = Stage

    process = factory.SubFactory(ProcessFactory)
    name = factory.Sequence(lambda n: f'Etapa {n}')
    order = factory.Sequence(lambda n: n + 1)


class EvaluationCriterionFactory(DjangoModelFactory):
    class Meta:
        model = EvaluationCriterion

    stage = factory.SubFactory(StageFactory)
    name = factory.Sequence(lambda n: f'Critério {n}')
    order = factory.Sequence(lambda n: n + 1)


class ApplicationFactory(DjangoModelFactory):
    class Meta:
        model = Application

    process = factory.SubFactory(ProcessFactory)
    participant = factory.SubFactory(ParticipantFactory)
    submitted_at = factory.LazyFunction(timezone.now)


class EvaluationFactory(DjangoModelFactory):
    class Meta:
        model = Evaluation

    application = factory.SubFactory(ApplicationFactory)
    stage = factory.SubFactory(StageFactory)
    criterion = factory.SubFactory(EvaluationCriterionFactory)
    evaluator = factory.SubFactory(UserFactory)
    score = 8
