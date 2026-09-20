from celery import shared_task

from apps.recruitment import emails
from apps.recruitment.models import Application, Communication
from apps.teams.models import Participant

_TASK_OPTS = dict(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_backoff_max=600,
    max_retries=3,
    acks_late=True,
    soft_time_limit=30,
    time_limit=60,
)


def _participant(participant_id):
    return Participant.objects.select_related('user').get(pk=participant_id)


def _application(application_id):
    return Application.objects.select_related(
        'process', 'current_stage'
    ).get(pk=application_id)


@shared_task(**_TASK_OPTS)
def send_application_confirmed(self, participant_id, application_id) -> None:
    emails.send_application_confirmed(
        _participant(participant_id), _application(application_id)
    )


@shared_task(**_TASK_OPTS)
def send_stage_advanced(self, participant_id, application_id) -> None:
    emails.send_stage_advanced(
        _participant(participant_id), _application(application_id)
    )


@shared_task(**_TASK_OPTS)
def send_application_approved(self, participant_id, application_id) -> None:
    emails.send_application_approved(
        _participant(participant_id), _application(application_id)
    )


@shared_task(**_TASK_OPTS)
def send_application_rejected(self, participant_id, application_id) -> None:
    emails.send_application_rejected(
        _participant(participant_id), _application(application_id)
    )


@shared_task(**_TASK_OPTS)
def send_custom_communication(self, participant_id, communication_id) -> None:
    communication = Communication.objects.select_related('process').get(
        pk=communication_id
    )
    emails.send_custom_communication(_participant(participant_id), communication)


@shared_task(**_TASK_OPTS)
def send_organizer_invite(self, user_id, process_id, url='') -> None:
    from django.contrib.auth import get_user_model

    from apps.recruitment.models import Process

    user = get_user_model().objects.select_related('organizer_profile').get(pk=user_id)
    emails.send_organizer_invite(user, Process.objects.get(pk=process_id), url)
