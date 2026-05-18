import time
from types import SimpleNamespace
from unittest.mock import patch

from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand


def _fake_user(email):
    return SimpleNamespace(email=email)


def _fake_participant(name, email):
    return SimpleNamespace(full_name=name, course='Ciência da Computação', semester=4, user=_fake_user(email))


def _fake_membership(participant):
    return SimpleNamespace(participant=participant)


class _FakeMemberships:
    """Simula team.memberships.select_related(...).order_by(...)"""

    def __init__(self, participants):
        self._members = [_fake_membership(p) for p in participants]

    def select_related(self, *args):
        return self

    def order_by(self, *args):
        return self

    def __iter__(self):
        return iter(self._members)


def _fake_team(name, participants):
    return SimpleNamespace(name=name, memberships=_FakeMemberships(participants))


class _RedirectingEmail(EmailMultiAlternatives):
    """Intercepta envios: redireciona destinatários e prefixa assunto com [TESTE]."""

    _target = None

    def __init__(self, subject, body, from_email, to, **kwargs):
        prefixed = f'[TESTE] {subject}'
        redirected = [self._target]
        super().__init__(prefixed, body, from_email, redirected, **kwargs)


class Command(BaseCommand):
    help = 'Testa todos os templates de e-mail enviando para um endereço real'

    def add_arguments(self, parser):
        parser.add_argument('to_email', type=str)
        parser.add_argument('--dry-run', action='store_true', help='Lista os templates sem enviar')

    def handle(self, *args, **options):
        to = options['to_email']
        dry = options['dry_run']

        _RedirectingEmail._target = to

        # ── Objetos fake ──────────────────────────────────────────────
        leader = _fake_participant('Ana Líder', to)
        member = _fake_participant('Bruno Membro', to)
        requester = _fake_participant('Carla Solicitante', to)
        team = _fake_team('PixelForce', [leader, member])

        invite = SimpleNamespace(team=team, invited_by=leader, invitee=member)
        join_req = SimpleNamespace(team=team, requester=requester)

        # ── Tabela de casos de teste ──────────────────────────────────
        from apps.teams import emails as em

        cases = [
            ('send_invite_received',        lambda: em.send_invite_received(member, invite)),
            ('send_join_request_received',  lambda: em.send_join_request_received(leader, join_req)),
            ('send_invite_accepted',        lambda: em.send_invite_accepted(leader, invite)),
            ('send_invite_declined',        lambda: em.send_invite_declined(leader, invite)),
            ('send_join_accepted',          lambda: em.send_join_accepted(requester, join_req)),
            ('send_join_declined',          lambda: em.send_join_declined(requester, join_req)),
            ('send_team_submitted',         lambda: em.send_team_submitted(leader, team)),
            ('send_team_approved',          lambda: em.send_team_approved(leader, team)),
            ('send_team_rejected',          lambda: em.send_team_rejected(leader, team)),
            ('send_team_disbanded',         lambda: em.send_team_disbanded(leader, team)),
        ]

        if dry:
            self.stdout.write(self.style.WARNING('Modo dry-run — nenhum e-mail será enviado.\n'))
            for name, _ in cases:
                self.stdout.write(f'  • {name}')
            self.stdout.write(f'\nTotal: {len(cases)} templates')
            return

        self.stdout.write(f'Destino: {to}')
        self.stdout.write(f'Total de templates: {len(cases)}\n')

        success = 0
        failure = 0

        patch_target = 'django.core.mail.EmailMultiAlternatives'

        for i, (name, fn) in enumerate(cases):
            with patch(patch_target, _RedirectingEmail):
                try:
                    fn()
                    self.stdout.write(self.style.SUCCESS(f'  ✓ {name}'))
                    success += 1
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f'  ✗ {name} — {exc}'))
                    failure += 1

            if i < len(cases) - 1:
                time.sleep(2)

        self.stdout.write('')
        status = self.style.SUCCESS if failure == 0 else self.style.WARNING
        self.stdout.write(status(f'Total: {len(cases)} | Sucesso: {success} | Falha: {failure}'))
