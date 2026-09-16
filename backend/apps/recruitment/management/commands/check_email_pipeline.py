"""Verifica se o caminho do e-mail está de pé, de ponta a ponta.

Existe por causa de uma falha que não dá erro: se o broker está acessível mas
nenhum worker consome a fila, a requisição responde 200, a notificação aparece
no banco e o e-mail nunca sai. Ninguém percebe até um candidato reclamar que
não recebeu o resultado.

Rode antes de abrir as inscrições e antes de qualquer envio em massa.
"""

from django.conf import settings
from django.core.mail import get_connection
from django.core.management.base import BaseCommand

from apps.recruitment.services.notifications import _TASK_DISPATCH


class Command(BaseCommand):
    help = 'Checa broker, worker, backend de e-mail e tasks registradas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=float,
            default=3.0,
            help='Segundos de espera pela resposta do worker (padrão 3).',
        )

    def handle(self, *args, **options):
        failures = []

        self.stdout.write('')
        failures += self._check_eager_mode()
        failures += self._check_broker()
        failures += self._check_worker(options['timeout'])
        failures += self._check_email_backend()
        failures += self._check_dispatch()

        self.stdout.write('')
        if failures:
            self.stdout.write(
                self.style.ERROR(f'{len(failures)} problema(s) encontrado(s):')
            )
            for failure in failures:
                self.stdout.write(self.style.ERROR(f'  - {failure}'))
            raise SystemExit(1)

        self.stdout.write(
            self.style.SUCCESS('Caminho do e-mail operacional.')
        )

    # ── Checagens ─────────────────────────────────────────────────

    def _ok(self, message):
        self.stdout.write(self.style.SUCCESS(f'  [ok]    {message}'))
        return []

    def _fail(self, message):
        self.stdout.write(self.style.ERROR(f'  [FALHA] {message}'))
        return [message]

    def _warn(self, message):
        self.stdout.write(self.style.WARNING(f'  [aviso] {message}'))
        return []

    def _check_eager_mode(self):
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            return self._warn(
                'CELERY_TASK_ALWAYS_EAGER ligado: tasks rodam no processo web, '
                'sem broker. Aceitável em desenvolvimento, nunca em produção.'
            )
        return self._ok('modo eager desligado — tasks vão para a fila')

    def _check_broker(self):
        from core.celery import app

        try:
            connection = app.connection()
            connection.ensure_connection(max_retries=1, timeout=3)
            connection.release()
            return self._ok(f'broker acessível ({app.conf.broker_url})')
        except Exception as error:
            return self._fail(
                f'broker inacessível ({app.conf.broker_url}): '
                f'{type(error).__name__}. Nenhum e-mail será enfileirado.'
            )

    def _check_worker(self, timeout):
        from core.celery import app

        try:
            replies = app.control.ping(timeout=timeout) or []
        except Exception as error:
            return self._fail(
                f'não foi possível consultar workers: {type(error).__name__}'
            )

        if not replies:
            return self._fail(
                'nenhum worker respondeu. As tasks ficam enfileiradas e o '
                'e-mail nunca é enviado, sem erro visível. '
                'Suba `celery -A core worker`.'
            )

        names = ', '.join(name for reply in replies for name in reply)
        return self._ok(f'{len(replies)} worker(s) respondendo: {names}')

    def _check_email_backend(self):
        backend = settings.EMAIL_BACKEND
        if 'console' in backend.lower() or 'locmem' in backend.lower():
            return self._warn(
                f'EMAIL_BACKEND={backend} — e-mail não sai de verdade. '
                'Correto em desenvolvimento.'
            )
        try:
            connection = get_connection()
            connection.open()
            connection.close()
            return self._ok(f'backend de e-mail conectou ({backend})')
        except Exception as error:
            return self._fail(
                f'backend de e-mail falhou ({backend}): {type(error).__name__}'
            )

    def _check_dispatch(self):
        missing = [
            notification_type
            for notification_type, task in _TASK_DISPATCH.items()
            if task is None
        ]
        if missing:
            return self._fail(f'tipos sem task de e-mail: {", ".join(missing)}')
        return self._ok(
            f'{len(_TASK_DISPATCH)} tipos de notificação com task registrada'
        )
