"""E-mails do processo seletivo.

O layout vem de core/email_layout.py, o mesmo usado pelo hackathon.
"""

from django.utils import timezone

from core.email_layout import badge, base_html, em, footnote, info_rows, p, send

_FOOTER = (
    'Liga de TI &mdash; Processo Seletivo &nbsp;&bull;&nbsp; '
    'Este é um e-mail automático.'
)

_PURPLE = '#7132f5'
_GREEN = '#149e61'
_RED = '#dc2626'


def _date(value):
    """Data no fuso da Liga.

    O banco guarda em UTC. Sem converter, um prazo às 23:59 de Brasília sai como o
    dia seguinte no e-mail — o candidato leria um dia a mais do que tem.
    """
    if not value:
        return 'a definir'
    return timezone.localtime(value).strftime('%d/%m')


def _stage_rows(process):
    return [
        (f'{stage.order}. {stage.name}', _date(stage.end_at))
        for stage in process.stages.order_by('order')
    ]


def send_application_confirmed(participant, application):
    process = application.process
    stage = application.current_stage
    subject = f'[Liga de TI] Inscrição confirmada — {process.name}'

    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'Sua inscrição no {process.name} foi confirmada.\n\n'
        + (f'Primeira etapa: {stage.name}.\n\n' if stage else '')
        + 'Acompanhe sua candidatura pela plataforma.\n\n'
        'Liga de TI'
    )
    body = (
        badge('Inscrição Confirmada', '#f3f0ff', _PURPLE)
        + p(f'Olá, {em(participant.full_name)}.')
        + p(f'Sua inscrição no {em(process.name)} foi confirmada.')
        + info_rows(_stage_rows(process) or [('Etapas', 'a definir')])
        + p(
            f'A primeira etapa é {em(stage.name)}.' if stage
            else 'As etapas serão divulgadas em breve.'
        )
        + footnote(
            'Acompanhe o andamento da sua candidatura pela plataforma. '
            'Avisaremos por e-mail a cada mudança.'
        )
    )
    html = base_html(
        subject,
        f'Sua inscrição no {process.name} foi confirmada.',
        'Inscrição confirmada',
        body,
        footer_text=_FOOTER,
    )
    send(subject, text, html, [participant.user.email])


def send_stage_advanced(participant, application):
    process = application.process
    stage = application.current_stage
    subject = f'[Liga de TI] Você avançou para {stage.name} — {process.name}'

    rows = [('Etapa', stage.name), ('Prazo', _date(stage.end_at))]
    if stage.allows_file_upload:
        rows.append(
            ('Entrega', ', '.join(stage.allowed_file_types) or 'arquivo')
        )

    text = (
        f'Parabéns, {participant.full_name}!\n\n'
        f'Você avançou para a etapa {stage.name} do {process.name}.\n\n'
        f'{stage.description}\n\n'
        f'Prazo: até {_date(stage.end_at)}.\n\n'
        'Liga de TI'
    )
    body = (
        badge('Próxima Etapa', '#e8f7f0', _GREEN)
        + p(f'Parabéns, {em(participant.full_name)}!')
        + p(f'Você avançou para a etapa {em(stage.name)} do {process.name}.')
        + (p(stage.description) if stage.description else '')
        + info_rows(rows, accent=_GREEN)
        + footnote(
            'Envie o que for pedido dentro do prazo pela plataforma. '
            'Entregas fora do prazo podem não ser aceitas.'
            if stage.allows_file_upload
            else 'Acompanhe os detalhes da etapa pela plataforma.'
        )
    )
    html = base_html(
        subject,
        f'Você avançou para {stage.name}.',
        f'Você avançou para {stage.name}',
        body,
        top_color=_GREEN,
        footer_text=_FOOTER,
    )
    send(subject, text, html, [participant.user.email])


def send_application_approved(participant, application):
    process = application.process
    subject = '[Liga de TI] Você foi aprovado no processo seletivo!'

    text = (
        f'Parabéns, {participant.full_name}!\n\n'
        f'Você foi aprovado no {process.name} e agora faz parte da Liga de TI.\n\n'
        'Em breve entraremos em contato com os próximos passos.\n\n'
        'Liga de TI'
    )
    body = (
        badge('Aprovado', '#e8f7f0', _GREEN)
        + p(f'Parabéns, {em(participant.full_name)}!')
        + p(
            f'Você foi aprovado no {em(process.name)} e agora faz parte da '
            'Liga de TI.'
        )
        + footnote('Em breve entraremos em contato com os próximos passos.')
    )
    html = base_html(
        subject,
        'Você foi aprovado no processo seletivo da Liga de TI.',
        'Bem-vindo à Liga de TI!',
        body,
        top_color=_GREEN,
        footer_text=_FOOTER,
    )
    send(subject, text, html, [participant.user.email])


def send_application_rejected(participant, application):
    process = application.process
    subject = f'[Liga de TI] Resultado do processo seletivo — {process.name}'

    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'Agradecemos sua participação no {process.name}.\n\n'
        'Sua candidatura não seguiu para a próxima etapa desta vez.\n\n'
        'Esperamos você no próximo processo seletivo.\n\n'
        'Liga de TI'
    )
    body = (
        badge('Resultado', '#fdeaea', _RED)
        + p(f'Olá, {em(participant.full_name)}.')
        + p(f'Agradecemos de verdade sua participação no {em(process.name)}.')
        + p('Sua candidatura não seguiu adiante nesta edição.')
        + footnote(
            'Isso não diz respeito ao seu potencial — o número de vagas é '
            'limitado. Esperamos você no próximo processo seletivo.'
        )
    )
    html = base_html(
        subject,
        f'Resultado da sua candidatura no {process.name}.',
        'Resultado do processo seletivo',
        body,
        top_color=_RED,
        footer_text=_FOOTER,
    )
    send(subject, text, html, [participant.user.email])


def send_custom_communication(participant, communication):
    """Comunicado escrito pelo organizador. {nome} vira o nome do candidato."""
    message = communication.message.replace('{nome}', participant.full_name)
    subject = communication.subject

    text = f'{message}\n\nLiga de TI'
    body = (
        ''.join(p(line) for line in message.split('\n') if line.strip())
        + footnote(f'Comunicado referente ao {communication.process.name}.')
    )
    html = base_html(
        subject,
        subject,
        subject,
        body,
        footer_text=_FOOTER,
    )
    send(subject, text, html, [participant.user.email])
