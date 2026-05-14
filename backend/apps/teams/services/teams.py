from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.teams.models import Participant, Team, TeamMembership


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
