import pytest
from django.core import mail

from apps.teams.models import (
    InviteStatus,
    JoinRequest,
    Notification,
    NotificationType,
    TeamMembership,
)

from .factories import (
    JoinRequestFactory,
    ParticipantFactory,
    TeamFactory,
    TeamMembershipFactory,
)

pytestmark = pytest.mark.django_db


def join_url(team_id, request_id=None, action=None):
    base = f'/api/v1/teams/{team_id}/join-requests/'
    if request_id and action:
        return f'{base}{request_id}/{action}/'
    return base


def test_join_request_fails_if_team_not_open(auth):
    team = TeamFactory(is_open=False)
    requester = ParticipantFactory()
    client = auth(requester.user)
    r = client.post(join_url(team.id), {}, format='json')
    assert r.status_code == 400


def test_join_request_fails_if_requester_has_team(auth):
    team = TeamFactory(is_open=True)
    requester = ParticipantFactory()
    TeamFactory(leader=requester)
    client = auth(requester.user)
    r = client.post(join_url(team.id), {}, format='json')
    assert r.status_code == 400


def test_join_request_fails_if_team_full(auth):
    team = TeamFactory(is_open=True)
    for _ in range(3):
        TeamMembershipFactory(team=team)
    requester = ParticipantFactory()
    client = auth(requester.user)
    r = client.post(join_url(team.id), {}, format='json')
    assert r.status_code == 400


def test_join_request_sends_email_to_leader(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader, is_open=True)
    requester = ParticipantFactory()
    client = auth(requester.user)
    mail.outbox.clear()
    client.post(join_url(team.id), {}, format='json')
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [leader.user.email]


def test_join_request_creates_notification_for_leader(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader, is_open=True)
    requester = ParticipantFactory()
    client = auth(requester.user)
    client.post(join_url(team.id), {}, format='json')
    assert Notification.objects.filter(
        participant=leader, type=NotificationType.JOIN_REQUEST
    ).count() == 1


def test_leader_can_accept_join_request(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader, is_open=True)
    requester = ParticipantFactory()
    req = JoinRequestFactory(team=team, requester=requester)
    client = auth(leader.user)
    r = client.post(join_url(team.id, req.id, 'accept'))
    assert r.status_code == 200
    req.refresh_from_db()
    assert req.status == InviteStatus.ACCEPTED


def test_leader_can_decline_join_request(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader, is_open=True)
    requester = ParticipantFactory()
    req = JoinRequestFactory(team=team, requester=requester)
    client = auth(leader.user)
    r = client.post(join_url(team.id, req.id, 'decline'))
    assert r.status_code == 200
    req.refresh_from_db()
    assert req.status == InviteStatus.DECLINED


def test_accept_join_request_creates_membership(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader, is_open=True)
    requester = ParticipantFactory()
    req = JoinRequestFactory(team=team, requester=requester)
    client = auth(leader.user)
    client.post(join_url(team.id, req.id, 'accept'))
    assert TeamMembership.objects.filter(team=team, participant=requester).exists()
