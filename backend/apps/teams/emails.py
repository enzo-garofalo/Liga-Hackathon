import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

HACKATHON_DATE = '13/06'
ANALYSIS_DEADLINE = '06/06'

_FONT = 'Arial, Helvetica, sans-serif'
_MONO = "'Courier New', Courier, monospace"


def _deadline():
    return settings.TEAM_DEADLINE.strftime('%d/%m')


# ── HTML primitives ───────────────────────────────────────────────────────────

def _em(text):
    return f'<strong style="font-weight:600;color:#101114;">{text}</strong>'


def _p(text):
    return (
        f'<p style="margin:0 0 16px 0;font-family:{_FONT};font-size:15px;'
        f'color:#101114;line-height:1.6;">{text}</p>'
    )


def _badge(label, bg, color):
    """Badge de status. bg e color são hex sólidos — sem rgba (compatibilidade Outlook)."""
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">'
        f'<tr><td style="padding:6px 14px;background-color:{bg};color:{color};'
        f'border-radius:4px;font-family:{_FONT};font-size:12px;font-weight:600;'
        f'text-transform:uppercase;letter-spacing:0.5px;">'
        f'{label}</td></tr>'
        f'</table>'
    )


def _info_rows(rows, accent='#7132f5'):
    """Info card com borda esquerda colorida. Espaçamento via padding em <td>, não margin."""
    cells = ''
    for i, (label, value) in enumerate(rows):
        border = 'border-bottom:1px solid #dedee5;' if i < len(rows) - 1 else ''
        cells += (
            f'<tr><td style="padding:8px 0;{border}">'
            f'<span style="display:block;font-family:{_FONT};font-size:11px;color:#9497a9;'
            f'text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">{label}</span>'
            f'<strong style="font-family:{_FONT};font-size:15px;color:#101114;'
            f'font-weight:600;">{value}</strong>'
            f'</td></tr>'
        )
    # Wrapper table usa padding em <td> para espaçamento — sem margin em <table>
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        f'<tr><td style="padding:4px 0 20px 0;">'
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%" '
        f'style="background-color:#f8f8fa;border-left:3px solid {accent};">'
        f'<tr><td style="padding:14px 20px;">'
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        f'{cells}'
        f'</table>'
        f'</td></tr>'
        f'</table>'
        f'</td></tr>'
        f'</table>'
    )


def _footnote(text):
    return (
        f'<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        f'<tr><td style="padding-top:16px;border-top:1px solid #dedee5;">'
        f'<span style="font-family:{_FONT};font-size:13px;color:#9497a9;line-height:1.5;">'
        f'{text}</span>'
        f'</td></tr>'
        f'</table>'
    )


def _base_html(title, preheader, headline, body_html, top_color='#7132f5'):
    """
    Template base. top_color muda por tipo de e-mail:
      - Convite / info / submetido: #7132f5 (roxo)
      - Aceito / aprovado:          #149e61 (verde)
      - Recusado / encerrado:       #dc2626 (vermelho)

    Compatibilidade:
      - Sem gradient (Outlook não suporta background-image)
      - Largura fixa width="600" para Outlook + max-width CSS para Gmail/Apple Mail
      - bgcolor atributo + background-color inline (dupla garantia)
      - Divisores como rows de 1px em vez de border-bottom em <td>
      - Barra de 4px com height atributo + line-height + font-size (evita Outlook expandir)
    """
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;" bgcolor="#f4f4f6">

<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f4f6;">{preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f6" style="background-color:#f4f4f6;">
<tr><td align="center" style="padding:40px 16px;">

  <table width="600" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#ffffff" style="background-color:#ffffff;max-width:600px;">

    <!-- Barra de cor no topo: solid (sem gradient — Outlook-safe)
         height atributo + line-height + font-size evitam que Outlook expanda célula vazia -->
    <tr>
      <td height="4" bgcolor="{top_color}" style="height:4px;line-height:4px;font-size:4px;background-color:{top_color};">&#8203;</td>
    </tr>

    <!-- Header: logo em texto (não <img>) — evita bloqueio de imagem no Gmail/Outlook -->
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:28px 40px 24px;">
        <span style="font-family:{_MONO};font-size:15px;font-weight:700;color:#7132f5;letter-spacing:3px;text-transform:uppercase;">LIGA DE TI</span>
      </td>
    </tr>

    <!-- Divisor como row separada (mais confiável que border-bottom no <td> em Outlook) -->
    <tr>
      <td height="1" bgcolor="#dedee5" style="height:1px;line-height:1px;font-size:1px;background-color:#dedee5;">&#8203;</td>
    </tr>

    <!-- Corpo -->
    <tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 40px 36px;">
        <h1 style="margin:0 0 20px 0;font-family:{_FONT};font-size:22px;font-weight:700;color:#101114;line-height:1.3;">{headline}</h1>
        {body_html}
      </td>
    </tr>

    <!-- Divisor -->
    <tr>
      <td height="1" bgcolor="#dedee5" style="height:1px;line-height:1px;font-size:1px;background-color:#dedee5;">&#8203;</td>
    </tr>

    <!-- Footer -->
    <tr>
      <td bgcolor="#f8f8fa" style="background-color:#f8f8fa;padding:20px 40px;">
        <span style="font-family:{_FONT};font-size:12px;color:#9497a9;line-height:1.5;">Liga de TI &mdash; Hackathon 2026 &nbsp;&bull;&nbsp; Este é um e-mail automático.</span>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>"""


# ── Email sender ──────────────────────────────────────────────────────────────

def _send(subject, text, html, recipients):
    try:
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, recipients)
        msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception:
        logger.exception('Falha ao enviar e-mail "%s" para %s', subject, recipients)


# ── Transactional emails ──────────────────────────────────────────────────────

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
