import pytest

from apps.teams.models import Team, TeamMembership

from .factories import ParticipantFactory, TeamFactory, TeamMembershipFactory

pytestmark = pytest.mark.django_db


TEAMS_URL = '/api/v1/teams/'


def teams_url(pk, suffix=''):
    return f'/api/v1/teams/{pk}/{suffix}'


def test_create_team_makes_creator_leader_and_member(auth):
    p = ParticipantFactory()
    client = auth(p.user)
    r = client.post(TEAMS_URL, {'name': 'NewTeam', 'is_open': True}, format='json')
    assert r.status_code == 201
    team = Team.objects.get(name='NewTeam')
    assert team.leader_id == p.id
    assert team.memberships.count() == 1
    assert team.memberships.first().participant_id == p.id


def test_create_team_fails_if_participant_has_team(auth):
    p = ParticipantFactory()
    TeamFactory(leader=p)  # creates membership for p via factory hook
    client = auth(p.user)
    r = client.post(TEAMS_URL, {'name': 'Other'}, format='json')
    assert r.status_code == 400


def test_submit_team_succeeds_with_4_members(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    for _ in range(3):
        TeamMembershipFactory(team=team)
    client = auth(leader.user)
    r = client.post(teams_url(team.id, 'submit/'))
    assert r.status_code == 200
    team.refresh_from_db()
    assert team.status == Team.STATUS_SUBMITTED
    assert team.is_open is False
    assert team.submitted_at is not None


def test_submit_team_fails_with_less_than_4_members(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    TeamMembershipFactory(team=team)  # only 2 members
    client = auth(leader.user)
    r = client.post(teams_url(team.id, 'submit/'))
    assert r.status_code == 400


def test_submit_locks_membership_operations(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    members = [TeamMembershipFactory(team=team) for _ in range(3)]
    client = auth(leader.user)
    client.post(teams_url(team.id, 'submit/'))

    # Try to leave a submitted team
    other_user = members[0].participant.user
    leave_client = auth(other_user)
    r = leave_client.delete(teams_url(team.id, 'leave/'))
    assert r.status_code == 400

    # Try to remove a member
    target = members[1].participant
    r = client.delete(teams_url(team.id, f'members/{target.id}/'))
    assert r.status_code == 400


def test_leave_team_transfers_leadership_to_oldest_member(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    older = TeamMembershipFactory(team=team)
    TeamMembershipFactory(team=team)  # newer
    client = auth(leader.user)
    r = client.delete(teams_url(team.id, 'leave/'))
    assert r.status_code == 204
    team.refresh_from_db()
    assert team.leader_id == older.participant_id


def test_leave_team_deletes_team_if_last_member(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    team_id = team.id
    client = auth(leader.user)
    r = client.delete(teams_url(team_id, 'leave/'))
    assert r.status_code == 204
    assert not Team.objects.filter(id=team_id).exists()


def test_remove_member_only_allowed_by_leader(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    other = TeamMembershipFactory(team=team)
    third = TeamMembershipFactory(team=team)
    client = auth(other.participant.user)
    r = client.delete(teams_url(team.id, f'members/{third.participant_id}/'))
    assert r.status_code == 403


def test_remove_member_blocked_when_submitted(auth):
    leader = ParticipantFactory()
    team = TeamFactory(leader=leader)
    members = [TeamMembershipFactory(team=team) for _ in range(3)]
    client = auth(leader.user)
    client.post(teams_url(team.id, 'submit/'))
    target = members[0].participant
    r = client.delete(teams_url(team.id, f'members/{target.id}/'))
    assert r.status_code == 400
