from datetime import date, timedelta
from io import StringIO

import pytest
from django.core import mail
from django.core.management import call_command
from django.utils import timezone

from apps.teams.models import (
    NotificationType,
    Team,
)

from .factories import (
    ParticipantFactory,
    TeamFactory,
    TeamMembershipFactory,
)

pytestmark = pytest.mark.django_db


def _set_deadline_in_past(settings):
    settings.TEAM_DEADLINE = timezone.localdate() - timedelta(days=1)


def _set_deadline_in_future(settings):
    settings.TEAM_DEADLINE = timezone.localdate() + timedelta(days=30)


def test_disband_incomplete_teams_command_deletes_forming_teams(settings):
    _set_deadline_in_past(settings)
    forming = TeamFactory()
    out = StringIO()
    call_command('disband_incomplete_teams', stdout=out)
    assert not Team.objects.filter(id=forming.id).exists()


def test_disband_sends_email_to_all_members(settings):
    _set_deadline_in_past(settings)
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    members = [TeamMembershipFactory(team=team).participant for _ in range(2)]
    expected_recipients = {leader.user.email} | {m.user.email for m in members}
    mail.outbox.clear()
    call_command('disband_incomplete_teams', stdout=StringIO())
    actual_recipients = {msg.to[0] for msg in mail.outbox}
    assert actual_recipients == expected_recipients


def test_disband_does_not_affect_submitted_or_approved_teams(settings):
    _set_deadline_in_past(settings)
    submitted = TeamFactory()
    submitted.status = Team.STATUS_SUBMITTED
    submitted.submitted_at = timezone.now()
    submitted.save()
    approved = TeamFactory()
    approved.status = Team.STATUS_APPROVED
    approved.save()

    call_command('disband_incomplete_teams', stdout=StringIO())
    assert Team.objects.filter(id=submitted.id).exists()
    assert Team.objects.filter(id=approved.id).exists()


def test_teams_cannot_be_created_after_deadline(auth, settings):
    _set_deadline_in_past(settings)
    p = ParticipantFactory()
    client = auth(p.user)
    r = client.post('/api/v1/teams/', {'name': 'TooLate'}, format='json')
    assert r.status_code == 400


def test_teams_cannot_be_submitted_after_deadline(auth, settings):
    # Create team while deadline is still in the future
    _set_deadline_in_future(settings)
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    for _ in range(3):
        TeamMembershipFactory(team=team)
    # Now move deadline to the past and try to submit
    _set_deadline_in_past(settings)
    client = auth(leader.user)
    r = client.post(f'/api/v1/teams/{team.id}/submit/')
    assert r.status_code == 400
