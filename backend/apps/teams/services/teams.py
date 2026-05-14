from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.teams.models import (
    InviteStatus,
    JoinRequest,
    Participant,
    Team,
    TeamInvite,
    TeamMembership,
)


def deadline_passed():
    return timezone.localdate() > settings.TEAM_DEADLINE


def assert_deadline_not_passed():
    if deadline_passed():
        raise ValidationError('O prazo de formação de equipes encerrou.')


def assert_team_forming(team):
    if team.status != Team.STATUS_FORMING:
        raise ValidationError(
            'Esta operação não é permitida após a submissão da equipe.'
        )


def assert_is_leader(team, participant):
    if team.leader_id != participant.id:
        raise PermissionDenied(
            'Apenas o líder da equipe pode realizar esta operação.'
        )


def get_request_participant(request):
    try:
        return request.user.participant
    except Participant.DoesNotExist:
        raise PermissionDenied(
            'Esta operação é restrita a participantes cadastrados.'
        )


@transaction.atomic
def leave_team(team, participant):
    team = Team.objects.select_for_update().get(pk=team.pk)
    assert_team_forming(team)

    membership = TeamMembership.objects.filter(
        team=team, participant=participant
    ).first()
    if not membership:
        raise ValidationError('Você não é membro desta equipe.')

    is_leader = team.leader_id == participant.id
    membership.delete()

    if not is_leader:
        return

    next_member = (
        TeamMembership.objects.filter(team=team).order_by('joined_at').first()
    )
    if next_member:
        team.leader = next_member.participant
        team.save(update_fields=['leader', 'updated_at'])
    else:
        team.delete()


@transaction.atomic
def submit_team(team):
    team = Team.objects.select_for_update().get(pk=team.pk)
    assert_team_forming(team)
    assert_deadline_not_passed()

    member_count = TeamMembership.objects.filter(team=team).count()
    if member_count != 4:
        raise ValidationError(
            f'A equipe precisa ter exatamente 4 membros para ser submetida '
            f'(atual: {member_count}).'
        )

    team.status = Team.STATUS_SUBMITTED
    team.is_open = False
    team.submitted_at = timezone.now()
    team.save(update_fields=['status', 'is_open', 'submitted_at', 'updated_at'])
    return team


@transaction.atomic
def remove_member(team, participant):
    team = Team.objects.select_for_update().get(pk=team.pk)
    assert_team_forming(team)

    if team.leader_id == participant.id:
        raise ValidationError(
            'Use a operação de sair da equipe para o líder deixar o time.'
        )

    membership = TeamMembership.objects.filter(
        team=team, participant=participant
    ).first()
    if not membership:
        raise ValidationError('Este participante não é membro da equipe.')

    membership.delete()


def _cancel_other_pending(participant, exclude_invite_id=None, exclude_request_id=None):
    """Marca como declined todos os invites + join_requests pendentes do participante."""
    invites = TeamInvite.objects.filter(
        invitee=participant, status=InviteStatus.PENDING
    )
    if exclude_invite_id:
        invites = invites.exclude(pk=exclude_invite_id)
    invites.update(status=InviteStatus.DECLINED)

    requests = JoinRequest.objects.filter(
        requester=participant, status=InviteStatus.PENDING
    )
    if exclude_request_id:
        requests = requests.exclude(pk=exclude_request_id)
    requests.update(status=InviteStatus.DECLINED)


@transaction.atomic
def accept_invite(invite, participant):
    if invite.invitee_id != participant.id:
        raise PermissionDenied('Este convite não é seu.')
    if invite.status != InviteStatus.PENDING:
        raise ValidationError('Este convite não está mais pendente.')

    team = Team.objects.select_for_update().get(pk=invite.team_id)
    assert_team_forming(team)
    if team.memberships.count() >= 4:
        raise ValidationError('A equipe já tem 4 membros.')
    if participant.has_team:
        raise ValidationError('Você já está em uma equipe.')

    membership = TeamMembership.objects.create(team=team, participant=participant)
    invite.status = InviteStatus.ACCEPTED
    invite.save(update_fields=['status'])
    _cancel_other_pending(participant, exclude_invite_id=invite.pk)
    return membership


@transaction.atomic
def decline_invite(invite, participant):
    if invite.invitee_id != participant.id:
        raise PermissionDenied('Este convite não é seu.')
    if invite.status != InviteStatus.PENDING:
        raise ValidationError('Este convite não está mais pendente.')
    invite.status = InviteStatus.DECLINED
    invite.save(update_fields=['status'])


@transaction.atomic
def accept_join_request(req, leader):
    team = Team.objects.select_for_update().get(pk=req.team_id)
    assert_is_leader(team, leader)
    if req.status != InviteStatus.PENDING:
        raise ValidationError('Este pedido não está mais pendente.')
    assert_team_forming(team)
    if team.memberships.count() >= 4:
        raise ValidationError('A equipe já tem 4 membros.')

    requester = req.requester
    if requester.has_team:
        raise ValidationError('O participante já entrou em outra equipe.')

    membership = TeamMembership.objects.create(team=team, participant=requester)
    req.status = InviteStatus.ACCEPTED
    req.save(update_fields=['status'])
    _cancel_other_pending(requester, exclude_request_id=req.pk)
    return membership


@transaction.atomic
def decline_join_request(req, leader):
    team = Team.objects.select_for_update().get(pk=req.team_id)
    assert_is_leader(team, leader)
    if req.status != InviteStatus.PENDING:
        raise ValidationError('Este pedido não está mais pendente.')
    req.status = InviteStatus.DECLINED
    req.save(update_fields=['status'])
