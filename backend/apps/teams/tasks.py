from celery import shared_task

from apps.teams import emails
from apps.teams.models import JoinRequest, Participant, Team, TeamInvite

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


@shared_task(**_TASK_OPTS)
def send_invite_received(self, participant_id: int, invite_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    invite = TeamInvite.objects.select_related('team', 'invited_by').get(pk=invite_id)
    emails.send_invite_received(participant, invite)


@shared_task(**_TASK_OPTS)
def send_join_request_received(self, participant_id: int, join_request_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    join_request = JoinRequest.objects.select_related('requester', 'team').get(pk=join_request_id)
    emails.send_join_request_received(participant, join_request)


@shared_task(**_TASK_OPTS)
def send_invite_accepted(self, participant_id: int, invite_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    invite = TeamInvite.objects.select_related('invitee', 'team').get(pk=invite_id)
    emails.send_invite_accepted(participant, invite)


@shared_task(**_TASK_OPTS)
def send_invite_declined(self, participant_id: int, invite_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    invite = TeamInvite.objects.select_related('invitee', 'team').get(pk=invite_id)
    emails.send_invite_declined(participant, invite)


@shared_task(**_TASK_OPTS)
def send_join_accepted(self, participant_id: int, join_request_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    join_request = JoinRequest.objects.select_related('team').get(pk=join_request_id)
    emails.send_join_accepted(participant, join_request)


@shared_task(**_TASK_OPTS)
def send_join_declined(self, participant_id: int, join_request_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    join_request = JoinRequest.objects.select_related('team').get(pk=join_request_id)
    emails.send_join_declined(participant, join_request)


@shared_task(**_TASK_OPTS)
def send_team_submitted(self, participant_id: int, team_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    team = Team.objects.prefetch_related('memberships__participant').get(pk=team_id)
    emails.send_team_submitted(participant, team)


@shared_task(**_TASK_OPTS)
def send_team_approved(self, participant_id: int, team_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    team = Team.objects.get(pk=team_id)
    emails.send_team_approved(participant, team)


@shared_task(**_TASK_OPTS)
def send_team_rejected(self, participant_id: int, team_id: int) -> None:
    participant = Participant.objects.get(pk=participant_id)
    team = Team.objects.get(pk=team_id)
    emails.send_team_rejected(participant, team)


@shared_task(**_TASK_OPTS)
def send_team_disbanded(self, participant_id: int, team_id: int) -> None:
    # team may already be deleted by the time the task runs — handle gracefully
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return
    participant = Participant.objects.get(pk=participant_id)
    emails.send_team_disbanded(participant, team)
