import pytest
from django.db.utils import IntegrityError

from apps.recruitment.models import ProcessStatus

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    ProcessFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


def test_process_default_status_is_draft():
    process = ProcessFactory()
    assert process.status == ProcessStatus.DRAFT


def test_stage_order_unique_per_process(process):
    StageFactory(process=process, order=1)
    with pytest.raises(IntegrityError):
        StageFactory(process=process, order=1)


def test_stage_order_can_repeat_across_processes():
    StageFactory(process=ProcessFactory(), order=1)
    StageFactory(process=ProcessFactory(), order=1)


def test_application_unique_per_process_and_participant(process):
    application = ApplicationFactory(process=process)
    with pytest.raises(IntegrityError):
        ApplicationFactory(process=process, participant=application.participant)


def test_application_final_score_is_none_without_evaluations(process):
    application = ApplicationFactory(process=process)
    assert application.final_score is None


def test_stage_average_is_mean_of_criteria_averages(process):
    stage = StageFactory(process=process, order=1)
    first = EvaluationCriterionFactory(stage=stage, order=1)
    second = EvaluationCriterionFactory(stage=stage, order=2)
    application = ApplicationFactory(process=process, current_stage=stage)

    # Critério 1: média entre dois avaliadores = 8.0
    EvaluationFactory(application=application, stage=stage, criterion=first, score=9)
    EvaluationFactory(application=application, stage=stage, criterion=first, score=7)
    # Critério 2: um avaliador só = 6.0
    EvaluationFactory(application=application, stage=stage, criterion=second, score=6)

    assert float(application.stage_average(stage)) == pytest.approx(7.0)


def test_application_final_score_averages_stage_averages(process):
    first_stage = StageFactory(process=process, order=1)
    second_stage = StageFactory(process=process, order=2)
    first_criterion = EvaluationCriterionFactory(stage=first_stage, order=1)
    second_criterion = EvaluationCriterionFactory(stage=second_stage, order=1)
    application = ApplicationFactory(process=process, current_stage=second_stage)

    EvaluationFactory(
        application=application,
        stage=first_stage,
        criterion=first_criterion,
        score=10,
    )
    EvaluationFactory(
        application=application,
        stage=second_stage,
        criterion=second_criterion,
        score=6,
    )

    assert float(application.final_score) == pytest.approx(8.0)


def test_evaluation_unique_per_criterion_and_evaluator(process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage)
    application = ApplicationFactory(process=process, current_stage=stage)
    evaluation = EvaluationFactory(
        application=application,
        stage=stage,
        criterion=criterion,
        score=8,
    )

    with pytest.raises(IntegrityError):
        EvaluationFactory(
            application=application,
            stage=stage,
            criterion=criterion,
            evaluator=evaluation.evaluator,
            score=9,
        )


def test_two_evaluators_can_score_the_same_criterion(process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage)
    application = ApplicationFactory(process=process, current_stage=stage)

    EvaluationFactory(application=application, stage=stage, criterion=criterion, score=9)
    EvaluationFactory(application=application, stage=stage, criterion=criterion, score=7)

    assert application.evaluations.count() == 2
