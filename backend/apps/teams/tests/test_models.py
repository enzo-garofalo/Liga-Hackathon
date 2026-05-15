import pytest
from django.db import IntegrityError

from apps.teams.models import Team, TeamMembership

from .factories import ParticipantFactory, TeamFactory

pytestmark = pytest.mark.django_db


def test_participant_has_team_false_when_no_membership():
    participant = ParticipantFactory()
    assert participant.has_team is False


def test_participant_has_team_true_when_membership_exists():
    participant = ParticipantFactory()
    team = Team.objects.create(name='X', leader=participant)
    TeamMembership.objects.create(team=team, participant=participant)
    assert participant.has_team is True


def test_team_status_default_is_forming():
    team = TeamFactory()
    assert team.status == Team.STATUS_FORMING


def test_team_membership_unique_per_participant():
    p = ParticipantFactory()
    t1 = Team.objects.create(name='T1', leader=p)
    TeamMembership.objects.create(team=t1, participant=p)

    other_leader = ParticipantFactory()
    t2 = Team.objects.create(name='T2', leader=other_leader)
    with pytest.raises(IntegrityError):
        TeamMembership.objects.create(team=t2, participant=p)
