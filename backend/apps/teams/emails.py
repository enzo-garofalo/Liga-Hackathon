from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def send_approval_email(team):
    subject = '[Liga de TI] Sua equipe foi aprovada para o Hackathon!'
    recipients = list(team.participants.values_list('email', flat=True))

    text = (
        f'Parabéns, equipe {team.name}!\n\n'
        f'Temos o prazer de informar que sua equipe foi selecionada para o Hackathon da Liga de TI.\n\n'
        f'Projeto: {team.title}\n\n'
        f'Os próximos passos serão comunicados em breve pela organização.\n\n'
        f'Atenciosamente,\nLiga de TI'
    )
    html = (
        f'<p>Parabéns, equipe <strong>{team.name}</strong>!</p>'
        f'<p>Temos o prazer de informar que sua equipe foi selecionada para o Hackathon da Liga de TI.</p>'
        f'<p><strong>Projeto:</strong> {team.title}</p>'
        f'<p>Os próximos passos serão comunicados em breve pela organização.</p>'
        f'<p>Atenciosamente,<br>Liga de TI</p>'
    )

    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, recipients)
    msg.attach_alternative(html, 'text/html')
    msg.send()


def send_rejection_email(team):
    subject = '[Liga de TI] Resultado da inscrição para o Hackathon'
    recipients = list(team.participants.values_list('email', flat=True))

    text = (
        f'Olá, equipe {team.name}.\n\n'
        f'Agradecemos pelo interesse e pela participação no Hackathon da Liga de TI.\n\n'
        f'Após análise das inscrições, informamos que a equipe não foi selecionada nesta edição.\n\n'
        f'Incentivamos a participar nas próximas edições. Continuem desenvolvendo seus projetos!\n\n'
        f'Atenciosamente,\nLiga de TI'
    )
    html = (
        f'<p>Olá, equipe <strong>{team.name}</strong>.</p>'
        f'<p>Agradecemos pelo interesse e pela participação no Hackathon da Liga de TI.</p>'
        f'<p>Após análise das inscrições, informamos que a equipe não foi selecionada nesta edição.</p>'
        f'<p>Incentivamos a participar nas próximas edições. Continuem desenvolvendo seus projetos!</p>'
        f'<p>Atenciosamente,<br>Liga de TI</p>'
    )

    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, recipients)
    msg.attach_alternative(html, 'text/html')
    msg.send()
