"""E-mails do processo seletivo.

O layout vem de core/email_layout.py, o mesmo usado pelo hackathon.
"""

from django.conf import settings
from django.utils import timezone

from core.email_layout import (
    badge,
    base_html,
    button,
    em,
    footnote,
    info_rows,
    p,
    send,
)

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

    subject = (
        f'[Liga de TI] Retorno sobre o processo seletivo — {process.name}'
    )

    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'Agradecemos muito pelo seu interesse e pelo tempo dedicado ao '
        f'{process.name}.\n\n'
        'Após avaliarmos as candidaturas, sua candidatura não seguirá '
        'para as próximas etapas desta edição.\n\n'
        'Sabemos que participar de um processo seletivo envolve tempo, '
        'dedicação e expectativa. Por isso, queremos reforçar que essa '
        'decisão leva em conta o contexto, os critérios e o número de vagas '
        'desta edição — e não resume o seu potencial.\n\n'
        'Esperamos encontrar você nos próximos eventos e iniciativas da '
        'Liga. Também será um prazer receber novamente sua candidatura em '
        'futuras oportunidades.\n\n'
        'Atenciosamente,\n'
        'Equipe da Liga de TI e Empreendedorismo'
    )

    body = (
        badge('Processo seletivo', '#f1ecff', '#6437d6')
        + p(f'Olá, {em(participant.full_name)}.')
        + p(
            f'Agradecemos muito pelo seu interesse e pelo tempo dedicado '
            f'ao {em(process.name)}.'
        )
        + p(
            'Após avaliarmos as candidaturas, sua candidatura não seguirá '
            'para as próximas etapas desta edição.'
        )
        + p(
            'Sabemos que participar de um processo seletivo envolve tempo, '
            'dedicação e expectativa.'
        )
        + footnote(
            'Essa decisão leva em conta o contexto, os critérios e o número '
            'de vagas desta edição — e não resume o seu potencial. '
            'Esperamos encontrar você nos próximos eventos e iniciativas '
            'da Liga. Também será um prazer receber novamente sua '
            'candidatura em futuras oportunidades.'
        )
    )

    html = base_html(
        subject,
        f'Retorno sobre sua candidatura no {process.name}.',
        'Obrigado por participar',
        body,
        top_color='#6437d6',
        footer_text=_FOOTER,
    )

    send(subject, text, html, [participant.user.email])


def send_custom_communication(participant, communication):
    """Comunicado escrito pelo organizador, enviado como está.

    Sem substituição de variável no texto: a Liga preferiu manter simples, e
    o mesmo texto vai para todo mundo.
    """
    message = communication.message
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


def _nome_curto(user):
    profile = getattr(user, 'organizer_profile', None)
    nome = (profile.full_name if profile else '') or ''
    return nome.split(' ')[0] if nome else ''


def send_organizer_invite(user, process, url=''):
    """Convite para ajudar na correção de um processo.

    Com `url`, a conta é nova e o link leva a pessoa a criar a própria senha.
    Sem `url`, ela já tinha conta: o e-mail só avisa que agora ela tem trabalho
    neste processo, e mandar link de senha ali assustaria sem motivo.
    """
    entrada = settings.FRONTEND_URL.rstrip('/') + '/admin/login'
    nome = _nome_curto(user)
    saudacao = f'Olá, {nome}.' if nome else 'Olá.'
    subject = f'[Liga de TI] Você entrou na organização do {process.name}'

    if url:
        acao_text = (
            f'Para começar, crie a sua senha neste endereço:\n{url}\n\n'
            f'O link vale por algumas horas e só pode ser usado uma vez. '
            f'Depois disso, sua entrada é sempre por {entrada}.\n\n'
        )
        acao_html = (
            p(
                'Para começar, crie a sua senha. É só clicar no botão abaixo e '
                'escolher uma senha só sua.'
            )
            + button('Criar minha senha', url)
            + p(
                'Se o botão não funcionar, copie e cole este endereço no navegador:'
                f'<br><span style="font-size:13px;color:{_PURPLE};'
                f'word-break:break-all;">{url}</span>'
            )
            + info_rows([
                ('Validade do link', 'Algumas horas'),
                ('Uso', 'Uma vez só'),
                ('Entrada depois disso', entrada),
            ])
        )
    else:
        acao_text = f'Sua entrada continua sendo por {entrada}.\n\n'
        acao_html = (
            p('Você entra com a mesma conta e a mesma senha de sempre.')
            + button('Abrir a área do organizador', entrada)
        )

    text = (
        f'{saudacao}\n\n'
        f'Você foi incluído na organização do {process.name}, '
        f'na plataforma da Liga de TI.\n\n'
        f'{acao_text}'
        f'O que você vai encontrar lá: os candidatos que a coordenação '
        f'distribuir para você corrigir, e o espaço para dar as notas.\n\n'
        f'Liga de TI'
    )
    body = (
        badge('Organização', '#f3f0ff', _PURPLE)
        + p(f'Olá, {em(nome)}.' if nome else 'Olá.')
        + p(
            f'Você foi incluído na organização do {em(process.name)}, '
            f'na plataforma da Liga de TI.'
        )
        + acao_html
        + footnote(
            'Lá você encontra os candidatos que a coordenação distribuir para '
            'você corrigir, e o espaço para dar as notas. Se você não esperava '
            'este e-mail, fale com a coordenação da Liga antes de continuar.'
        )
    )
    html = base_html(
        subject,
        f'Você entrou na organização do {process.name}.',
        'Bem-vindo à organização',
        body,
        footer_text=_FOOTER,
    )
    send(subject, text, html, [user.email])
