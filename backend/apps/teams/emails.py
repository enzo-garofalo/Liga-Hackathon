from django.conf import settings

# Primitivas de layout vivem em core/email_layout.py, compartilhadas com o
# processo seletivo. Os aliases com _ mantêm o restante deste arquivo inalterado.
from core.email_layout import (  # noqa: F401
    FONT as _FONT,
    MONO as _MONO,
    badge as _badge,
    base_html as _base_html,
    button as _button,
    em as _em,
    footnote as _footnote,
    info_rows as _info_rows,
    p as _p,
    send as _send,
)

HACKATHON_DATE = '13/06'
ANALYSIS_DEADLINE = '06/06'


def _deadline():
    return settings.TEAM_DEADLINE.strftime('%d/%m')



def send_invite_received(participant, invite):
    team = invite.team
    leader = invite.invited_by
    subject = f'[Liga de TI] Você foi convidado para a equipe {team.name}'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'O líder {leader.full_name} convidou você para a equipe {team.name}.\n\n'
        f'Acesse seu dashboard para aceitar ou recusar o convite.\n\n'
        f'Lembre-se: as inscrições encerram em {_deadline()}.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Convite Recebido', '#f3f0ff', '#7132f5')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(
            f'O líder {_em(leader.full_name)} convidou você para participar do Hackathon '
            f'na equipe {_em(team.name)}.'
        )
        + _info_rows([
            ('Equipe', team.name),
            ('Líder', leader.full_name),
            ('Prazo para responder', _deadline()),
        ])
        + _p('Acesse seu dashboard para aceitar ou recusar o convite. Não deixe para a última hora!')
        + _footnote(
            f'Convites não respondidos até {_deadline()} são cancelados automaticamente.'
        )
    )
    html = _base_html(
        subject,
        f'Você foi convidado para a equipe {team.name} — acesse seu dashboard para responder.',
        'Você foi convidado para uma equipe',
        body,
    )
    _send(subject, text, html, [participant.user.email])


def send_join_request_received(participant, join_request):
    requester = join_request.requester
    team = join_request.team
    subject = f'[Liga de TI] Nova solicitação de entrada na equipe {team.name}'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'{requester.full_name} ({requester.course}, {requester.semester}º semestre) '
        f'pediu para entrar na sua equipe {team.name}.\n\n'
        f'Acesse seu dashboard para aceitar ou recusar o pedido.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Nova Solicitação', '#f3f0ff', '#7132f5')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(f'{_em(requester.full_name)} quer entrar na sua equipe.')
        + _info_rows([
            ('Solicitante', requester.full_name),
            ('Curso', requester.course),
            ('Semestre', f'{requester.semester}º semestre'),
            ('Equipe', team.name),
        ])
        + _p('Acesse seu dashboard para aceitar ou recusar o pedido.')
        + _footnote('Sua equipe precisa ter exatamente 4 membros para ser submetida.')
    )
    html = _base_html(
        subject,
        f'{requester.full_name} quer entrar na equipe {team.name} — acesse seu dashboard para decidir.',
        'Um participante quer entrar na sua equipe',
        body,
    )
    _send(subject, text, html, [participant.user.email])


def send_invite_accepted(participant, invite):
    invitee = invite.invitee
    team = invite.team
    subject = f'[Liga de TI] {invitee.full_name} aceitou seu convite'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'{invitee.full_name} aceitou o convite para entrar na equipe {team.name}.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Convite Aceito', '#ecfdf5', '#149e61')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(
            f'{_em(invitee.full_name)} aceitou o convite e agora faz parte '
            f'da equipe {_em(team.name)}.'
        )
        + _info_rows([
            ('Novo membro', invitee.full_name),
            ('Equipe', team.name),
        ], accent='#149e61')
        + _p('Acesse seu dashboard para acompanhar a formação da equipe.')
        + _footnote('Lembre-se: a equipe precisa de exatamente 4 membros para ser submetida.')
    )
    html = _base_html(
        subject,
        f'{invitee.full_name} aceitou o convite para a equipe {team.name}.',
        'Seu convite foi aceito!',
        body,
        top_color='#149e61',
    )
    _send(subject, text, html, [participant.user.email])


def send_invite_declined(participant, invite):
    invitee = invite.invitee
    team = invite.team
    subject = f'[Liga de TI] {invitee.full_name} recusou seu convite'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'{invitee.full_name} recusou o convite para a equipe {team.name}.\n\n'
        f'Você pode convidar outro participante pelo dashboard.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Convite Recusado', '#fef2f2', '#dc2626')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(
            f'{_em(invitee.full_name)} recusou o convite para a equipe {_em(team.name)}.'
        )
        + _info_rows([
            ('Equipe', team.name),
            ('Status do convite', 'Recusado'),
        ], accent='#dc2626')
        + _p('Você pode convidar outro participante pelo dashboard.')
        + _footnote(f'Prazo para formação de equipes: {_deadline()}.')
    )
    html = _base_html(
        subject,
        f'{invitee.full_name} recusou o convite para a equipe {team.name}.',
        'Seu convite foi recusado',
        body,
        top_color='#dc2626',
    )
    _send(subject, text, html, [participant.user.email])


def send_join_accepted(participant, join_request):
    team = join_request.team
    subject = f'[Liga de TI] Pedido aceito — equipe {team.name}'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'Seu pedido para entrar na equipe {team.name} foi aceito.\n\n'
        f'Acesse seu dashboard para acompanhar a equipe.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Pedido Aceito', '#ecfdf5', '#149e61')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(f'Seu pedido para entrar na equipe {_em(team.name)} foi aceito!')
        + _info_rows([
            ('Equipe', team.name),
            ('Status', 'Membro confirmado'),
        ], accent='#149e61')
        + _p('Acesse seu dashboard para acompanhar a equipe e os próximos passos.')
        + _footnote(
            f'A equipe precisa de 4 membros até {_deadline()} para ser submetida.'
        )
    )
    html = _base_html(
        subject,
        f'Seu pedido para entrar na equipe {team.name} foi aceito.',
        'Seu pedido foi aceito!',
        body,
        top_color='#149e61',
    )
    _send(subject, text, html, [participant.user.email])


def send_join_declined(participant, join_request):
    team = join_request.team
    subject = f'[Liga de TI] Pedido recusado — equipe {team.name}'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'Seu pedido para entrar na equipe {team.name} foi recusado.\n\n'
        f'Você pode explorar outras equipes abertas pelo dashboard.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Pedido Recusado', '#fef2f2', '#dc2626')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(
            f'Seu pedido para entrar na equipe {_em(team.name)} não foi aceito desta vez.'
        )
        + _info_rows([
            ('Equipe', team.name),
            ('Status', 'Pedido recusado'),
        ], accent='#dc2626')
        + _p('Você pode explorar outras equipes abertas e enviar novos pedidos pelo dashboard.')
        + _footnote(f'Prazo para formação de equipes: {_deadline()}.')
    )
    html = _base_html(
        subject,
        f'Seu pedido para a equipe {team.name} não foi aceito.',
        'Seu pedido não foi aceito',
        body,
        top_color='#dc2626',
    )
    _send(subject, text, html, [participant.user.email])


def send_team_submitted(participant, team):
    memberships = list(team.memberships.select_related('participant').order_by('joined_at'))
    members_text = ', '.join(m.participant.full_name for m in memberships)
    member_rows = [
        (f'Membro {i + 1}', m.participant.full_name)
        for i, m in enumerate(memberships)
    ]
    subject = f'[Liga de TI] Equipe {team.name} submetida para análise'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'A equipe {team.name} foi submetida para análise.\n\n'
        f'Membros: {members_text}.\n\n'
        f'Aguardem o resultado até {ANALYSIS_DEADLINE}.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Submetido', '#f3f0ff', '#7132f5')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(
            f'A equipe {_em(team.name)} foi submetida com sucesso e está em análise.'
        )
        + _info_rows([('Equipe', team.name)] + member_rows)
        + _p(
            f'Aguardem o resultado até {_em(ANALYSIS_DEADLINE)}. '
            f'Avisaremos por e-mail assim que houver uma decisão.'
        )
        + _footnote('A partir deste momento a equipe está bloqueada para alterações.')
    )
    html = _base_html(
        subject,
        f'A equipe {team.name} foi submetida para análise. Aguardem o resultado.',
        'Equipe submetida para análise',
        body,
    )
    _send(subject, text, html, [participant.user.email])


def send_team_approved(participant, team):
    subject = f'[Liga de TI] Equipe {team.name} aprovada para o Hackathon!'
    text = (
        f'Parabéns, {participant.full_name}!\n\n'
        f'A equipe {team.name} foi selecionada para o Hackathon da Liga de TI.\n\n'
        f'Data do hackathon: {HACKATHON_DATE}.\n\n'
        f'Os próximos passos serão comunicados em breve pela organização.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Aprovado ✓', '#ecfdf5', '#149e61')
        + _p(f'Parabéns, {_em(participant.full_name)}!')
        + _p(
            f'A equipe {_em(team.name)} foi selecionada para o Hackathon da Liga de TI. '
            f'É hora de mostrar do que vocês são capazes!'
        )
        + _info_rows([
            ('Equipe aprovada', team.name),
            ('Data do Hackathon', HACKATHON_DATE),
            ('Status', 'Confirmado ✓'),
        ], accent='#149e61')
        + _p(
            'Os próximos passos serão comunicados em breve pela organização. '
            'Fiquem atentos ao e-mail e ao grupo do WhatsApp.'
        )
        + _footnote('Parabéns a toda a equipe. Nos vemos no Hackathon!')
    )
    html = _base_html(
        subject,
        f'Parabéns! A equipe {team.name} foi aprovada para o Hackathon da Liga de TI!',
        f'A equipe {team.name} foi aprovada!',
        body,
        top_color='#149e61',
    )
    _send(subject, text, html, [participant.user.email])


def send_team_rejected(participant, team):
    subject = f'[Liga de TI] Resultado da análise — equipe {team.name}'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'Agradecemos pela inscrição da equipe {team.name} no Hackathon da Liga de TI.\n\n'
        f'Após análise, informamos que a equipe não foi selecionada nesta edição.\n\n'
        f'Continuem desenvolvendo seus projetos — esperamos vocês nas próximas edições!\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Resultado da Análise', '#fef2f2', '#dc2626')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(
            f'Agradecemos pela inscrição da equipe {_em(team.name)} '
            f'no Hackathon da Liga de TI.'
        )
        + _info_rows([
            ('Equipe', team.name),
            ('Status', 'Não selecionada nesta edição'),
        ], accent='#dc2626')
        + _p(
            'Após análise cuidadosa, a equipe não foi selecionada para esta edição. '
            'A concorrência foi grande e agradecemos a participação de todos.'
        )
        + _p(
            'Continuem desenvolvendo seus projetos. '
            'Esperamos vocês nas próximas edições da Liga de TI!'
        )
        + _footnote('Este e-mail foi enviado para todos os membros da equipe.')
    )
    html = _base_html(
        subject,
        f'Resultado da análise da equipe {team.name} — Liga de TI Hackathon 2026.',
        'Resultado da análise',
        body,
        top_color='#dc2626',
    )
    _send(subject, text, html, [participant.user.email])


def send_team_disbanded(participant, team):
    subject = f'[Liga de TI] Inscrições encerradas — equipe {team.name}'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'O prazo para formação de equipes encerrou em {_deadline()}.\n\n'
        f'A equipe {team.name} não atingiu 4 membros e foi descartada automaticamente.\n\n'
        f'Esperamos vocês nas próximas edições!\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Prazo Encerrado', '#fffbeb', '#d97706')
        + _p(f'Olá, {_em(participant.full_name)}.')
        + _p(f'O prazo para formação de equipes encerrou em {_em(_deadline())}.')
        + _info_rows([
            ('Equipe', team.name),
            ('Prazo encerrado em', _deadline()),
            ('Motivo', 'Menos de 4 membros ao fim do prazo'),
        ], accent='#d97706')
        + _p(
            f'A equipe {_em(team.name)} foi descartada automaticamente por não atingir '
            f'o mínimo de 4 membros antes do prazo.'
        )
        + _p('Esperamos vocês nas próximas edições da Liga de TI!')
        + _footnote('Este processo é automático e não pode ser revertido.')
    )
    html = _base_html(
        subject,
        f'O prazo encerrou e a equipe {team.name} foi descartada automaticamente.',
        'Prazo de formação encerrado',
        body,
        top_color='#dc2626',
    )
    _send(subject, text, html, [participant.user.email])


def _validade_do_link():
    """Validade em horas, lida do mesmo lugar que a regra usa.

    Escrever "2 horas" à mão faria o e-mail mentir no dia em que alguém
    mudasse PASSWORD_RESET_TIMEOUT.
    """
    horas = max(1, settings.PASSWORD_RESET_TIMEOUT // 3600)
    return f'{horas} hora' if horas == 1 else f'{horas} horas'


def _primeiro_nome(user):
    """Primeiro nome, quando a conta tem um.

    Organizador criado pelo `createsuperuser` não tem `Participant` nem nome
    preenchido. Nesse caso o e-mail abre só com "Olá.", em vez de saudar um
    nome vazio.
    """
    participant = getattr(user, 'participant', None)
    if participant and participant.full_name.strip():
        return participant.full_name.split()[0]
    nome_completo = user.get_full_name().strip()
    return nome_completo.split()[0] if nome_completo else ''


def send_password_reset(user, url):
    """Link para escolher uma senha nova.

    O endereço aparece duas vezes de propósito: no botão e escrito por extenso.
    Cliente de e-mail corporativo reescreve ou bloqueia o botão, e sem o texto
    a pessoa fica sem saída.
    """
    validade = _validade_do_link()
    nome = _primeiro_nome(user)
    saudacao = f'Olá, {nome}.' if nome else 'Olá.'
    subject = '[Liga de TI] Redefinição de senha'
    text = (
        f'{saudacao}\n\n'
        f'Recebemos um pedido para redefinir a senha da sua conta na '
        f'plataforma da Liga de TI.\n\n'
        f'Abra o endereço abaixo para escolher uma senha nova:\n{url}\n\n'
        f'O link vale por {validade} e só pode ser usado uma vez.\n\n'
        f'Se não foi você quem pediu, ignore este e-mail. '
        f'Sua senha atual continua valendo.\n\n'
        f'Liga de TI'
    )
    body = (
        _badge('Redefinir Senha', '#f3f0ff', '#7132f5')
        + _p(f'Olá, {_em(nome)}.' if nome else 'Olá.')
        + _p(
            'Recebemos um pedido para redefinir a senha da sua conta na '
            'plataforma da Liga de TI. É só clicar no botão abaixo.'
        )
        + _button('Escolher uma senha nova', url)
        + _p(
            'Se o botão não funcionar, copie e cole este endereço no navegador:'
            f'<br><span style="font-family:{_MONO};font-size:13px;color:#7132f5;'
            f'word-break:break-all;">{url}</span>'
        )
        + _info_rows([
            ('Validade do link', validade),
            ('Uso', 'Uma vez só'),
        ])
        + _footnote(
            'Se não foi você quem pediu, ignore este e-mail. Sua senha atual '
            'continua valendo e nada muda na sua conta.'
        )
    )
    html = _base_html(
        subject,
        f'Link para escolher uma senha nova. Vale por {validade}.',
        'Redefinição de senha',
        body,
    )
    _send(subject, text, html, [user.email])
