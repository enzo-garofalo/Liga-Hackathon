from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.teams.models import NotificationType, Team
from apps.teams.services.notifications import notify_many


class Command(BaseCommand):
    help = (
        'Descarta equipes com status=forming após TEAM_DEADLINE, '
        'notificando todos os membros por e-mail e in-app.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Lista as equipes que seriam descartadas, sem alterar nada.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Roda mesmo antes de TEAM_DEADLINE (uso em staging/teste).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        today = timezone.localdate()
        deadline = settings.TEAM_DEADLINE
        deadline_text = deadline.strftime('%d/%m')

        if today <= deadline and not force:
            self.stdout.write(self.style.WARNING(
                f'Hoje ({today}) ainda não passou de TEAM_DEADLINE ({deadline}). '
                f'Use --force para rodar mesmo assim.'
            ))
            return

        team_ids = list(
            Team.objects.filter(status=Team.STATUS_FORMING).values_list('id', flat=True)
        )
        if not team_ids:
            self.stdout.write('Nenhuma equipe forming para descartar.')
            return

        self.stdout.write(f'Encontradas {len(team_ids)} equipe(s) forming:')
        for team in Team.objects.filter(id__in=team_ids).select_related('leader'):
            members = ', '.join(
                m.participant.full_name
                for m in team.memberships.select_related('participant').order_by('joined_at')
            )
            self.stdout.write(
                f'  - {team.name} (líder: {team.leader.full_name}, '
                f'{team.memberships.count()} membros: {members or "nenhum"})'
            )

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Dry run — nenhuma equipe foi alterada.'))
            return

        disbanded = 0
        for team_id in team_ids:
            with transaction.atomic():
                team = (
                    Team.objects.select_for_update()
                    .filter(id=team_id, status=Team.STATUS_FORMING)
                    .first()
                )
                if team is None:
                    continue
                members = [
                    m.participant
                    for m in team.memberships.select_related('participant')
                ]
                notify_many(
                    members,
                    NotificationType.TEAM_DISBANDED,
                    f'A equipe {team.name} foi descartada automaticamente porque '
                    f'não atingiu 4 membros até {deadline_text}.',
                    link_to='/dashboard',
                    team=team,
                )
                team.delete()
                disbanded += 1

        self.stdout.write(self.style.SUCCESS(f'{disbanded} equipe(s) descartada(s).'))
