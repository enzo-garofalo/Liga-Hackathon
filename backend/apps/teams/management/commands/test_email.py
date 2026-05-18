from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Envia um e-mail de teste para verificar configuração SMTP'

    def add_arguments(self, parser):
        parser.add_argument('to_email', type=str)

    def handle(self, *args, **options):
        to = options['to_email']
        self.stdout.write(f'Enviando e-mail de teste para {to}...')
        self.stdout.write(f'Backend: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'Host: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}')
        self.stdout.write(f'From: {settings.DEFAULT_FROM_EMAIL}')

        try:
            send_mail(
                subject='[Liga de TI] Teste de configuração',
                message='Se você recebeu este e-mail, a configuração SMTP está funcionando!',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'E-mail enviado com sucesso para {to}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao enviar: {e}'))
