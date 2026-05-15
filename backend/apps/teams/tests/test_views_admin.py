import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone

from apps.teams.models import Team

from .factories import ParticipantFactory, TeamFactory, TeamMembershipFactory

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        username='admin@x.com', email='admin@x.com', password='admin12345!'
    )


def _make_submitted_team(member_count=4):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    for _ in range(member_count - 1):
        TeamMembershipFactory(team=team)
    team.status = Team.STATUS_SUBMITTED
    team.submitted_at = timezone.now()
    team.save()
    return team


def test_admin_list_shows_only_submitted_teams(auth, admin_user):
    _make_submitted_team()
    TeamFactory()  # forming
    approved = TeamFactory()
    approved.status = Team.STATUS_APPROVED
    approved.save()
    client = auth(admin_user)
    r = client.get('/api/v1/admin/teams/')
    assert r.status_code == 200
    statuses = {t['status'] for t in r.data}
    assert statuses == {Team.STATUS_SUBMITTED}


def test_approve_team_sends_email_to_all_members(auth, admin_user):
    team = _make_submitted_team()
    expected = {m.participant.user.email for m in team.memberships.all()}
    mail.outbox.clear()
    client = auth(admin_user)
    r = client.patch(f'/api/v1/admin/teams/{team.id}/approve/')
    assert r.status_code == 200
    actual = {msg.to[0] for msg in mail.outbox}
    assert actual == expected


def test_approve_team_fails_when_10_already_approved(auth, admin_user):
    for _ in range(10):
        t = TeamFactory()
        t.status = Team.STATUS_APPROVED
        t.save()
    team = _make_submitted_team()
    client = auth(admin_user)
    r = client.patch(f'/api/v1/admin/teams/{team.id}/approve/')
    assert r.status_code == 400


def test_reject_team_sends_email_to_all_members(auth, admin_user):
    team = _make_submitted_team()
    expected = {m.participant.user.email for m in team.memberships.all()}
    mail.outbox.clear()
    client = auth(admin_user)
    r = client.patch(f'/api/v1/admin/teams/{team.id}/reject/')
    assert r.status_code == 200
    actual = {msg.to[0] for msg in mail.outbox}
    assert actual == expected
