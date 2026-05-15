import pytest
from django.core import mail

from apps.teams.models import (
    InviteStatus,
    Notification,
    NotificationType,
    TeamInvite,
    TeamMembership,
)

from .factories import (
    ParticipantFactory,
    TeamFactory,
    TeamInviteFactory,
    TeamMembershipFactory,
)

pytestmark = pytest.mark.django_db


def invites_url(team_id):
    return f'/api/v1/teams/{team_id}/invites/'


def my_invite_url(invite_id, action):
    return f'/api/v1/me/invites/{invite_id}/{action}/'


def test_leader_can_invite_participant_without_team(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    invitee = ParticipantFactory()
    client = auth(leader.user)
    r = client.post(invites_url(team.id), {'invitee_id': str(invitee.id)}, format='json')
    assert r.status_code == 201
    assert TeamInvite.objects.filter(team=team, invitee=invitee).exists()


def test_invite_fails_if_invitee_has_team(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    invitee = ParticipantFactory()
    TeamFactory(leader=invitee)  # invitee now has a team
    client = auth(leader.user)
    r = client.post(invites_url(team.id), {'invitee_id': str(invitee.id)}, format='json')
    assert r.status_code == 400


def test_invite_fails_if_team_already_has_4_members(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    for _ in range(3):
        TeamMembershipFactory(team=team)
    invitee = ParticipantFactory()
    client = auth(leader.user)
    r = client.post(invites_url(team.id), {'invitee_id': str(invitee.id)}, format='json')
    assert r.status_code == 400


def test_invite_sends_email_to_invitee(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    invitee = ParticipantFactory()
    client = auth(leader.user)
    mail.outbox.clear()
    client.post(invites_url(team.id), {'invitee_id': str(invitee.id)}, format='json')
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [invitee.user.email]
    assert team.name in mail.outbox[0].subject


def test_invite_creates_notification_for_invitee(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    invitee = ParticipantFactory()
    client = auth(leader.user)
    client.post(invites_url(team.id), {'invitee_id': str(invitee.id)}, format='json')
    assert Notification.objects.filter(
        participant=invitee, type=NotificationType.TEAM_INVITE
    ).count() == 1


def test_accept_invite_creates_membership(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    invitee = ParticipantFactory()
    invite = TeamInviteFactory(team=team, invitee=invitee, invited_by=leader)
    client = auth(invitee.user)
    r = client.post(my_invite_url(invite.id, 'accept'))
    assert r.status_code == 200
    assert TeamMembership.objects.filter(team=team, participant=invitee).exists()
    invite.refresh_from_db()
    assert invite.status == InviteStatus.ACCEPTED


def test_accept_invite_cancels_other_pending_invites(auth):
    invitee = ParticipantFactory()
    team_a = TeamFactory()
    team_b = TeamFactory()
    inv_a = TeamInviteFactory(team=team_a, invitee=invitee, invited_by=team_a.leader)
    inv_b = TeamInviteFactory(team=team_b, invitee=invitee, invited_by=team_b.leader)
    client = auth(invitee.user)
    client.post(my_invite_url(inv_a.id, 'accept'))
    inv_b.refresh_from_db()
    assert inv_b.status == InviteStatus.DECLINED


def test_decline_invite_does_not_create_membership(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    invitee = ParticipantFactory()
    invite = TeamInviteFactory(team=team, invitee=invitee, invited_by=leader)
    client = auth(invitee.user)
    r = client.post(my_invite_url(invite.id, 'decline'))
    assert r.status_code == 200
    assert not TeamMembership.objects.filter(team=team, participant=invitee).exists()
    invite.refresh_from_db()
    assert invite.status == InviteStatus.DECLINED
