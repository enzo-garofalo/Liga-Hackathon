from django.conf import settings
from django.core.mail import EmailMultiAlternatives

HACKATHON_DATE = '06/06'
ANALYSIS_DEADLINE = '06/06'


def _deadline():
    return settings.TEAM_DEADLINE.strftime('%d/%m')


def _send(subject, text, html, recipients):
    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, recipients)
    msg.attach_alternative(html, 'text/html')
    msg.send()


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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p>O líder <strong>{leader.full_name}</strong> convidou você para a equipe '
        f'<strong>{team.name}</strong>.</p>'
        f'<p>Acesse seu dashboard para aceitar ou recusar o convite.</p>'
        f'<p>Lembre-se: as inscrições encerram em <strong>{_deadline()}</strong>.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p><strong>{requester.full_name}</strong> ({requester.course}, '
        f'{requester.semester}º semestre) pediu para entrar na sua equipe '
        f'<strong>{team.name}</strong>.</p>'
        f'<p>Acesse seu dashboard para aceitar ou recusar o pedido.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p><strong>{invitee.full_name}</strong> aceitou o convite para entrar '
        f'na equipe <strong>{team.name}</strong>.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p><strong>{invitee.full_name}</strong> recusou o convite para a equipe '
        f'<strong>{team.name}</strong>.</p>'
        f'<p>Você pode convidar outro participante pelo dashboard.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p>Seu pedido para entrar na equipe <strong>{team.name}</strong> foi aceito.</p>'
        f'<p>Acesse seu dashboard para acompanhar a equipe.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p>Seu pedido para entrar na equipe <strong>{team.name}</strong> foi recusado.</p>'
        f'<p>Você pode explorar outras equipes abertas pelo dashboard.</p>'
        f'<p>Liga de TI</p>'
    )
    _send(subject, text, html, [participant.user.email])


def send_team_submitted(participant, team):
    members = ', '.join(
        m.participant.full_name for m in team.memberships.select_related('participant').order_by('joined_at')
    )
    subject = f'[Liga de TI] Equipe {team.name} submetida para análise'
    text = (
        f'Olá, {participant.full_name}.\n\n'
        f'A equipe {team.name} foi submetida para análise.\n\n'
        f'Membros: {members}.\n\n'
        f'Aguardem o resultado até {ANALYSIS_DEADLINE}.\n\n'
        f'Liga de TI'
    )
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p>A equipe <strong>{team.name}</strong> foi submetida para análise.</p>'
        f'<p><strong>Membros:</strong> {members}.</p>'
        f'<p>Aguardem o resultado até <strong>{ANALYSIS_DEADLINE}</strong>.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Parabéns, <strong>{participant.full_name}</strong>!</p>'
        f'<p>A equipe <strong>{team.name}</strong> foi selecionada para o Hackathon da Liga de TI.</p>'
        f'<p><strong>Data do hackathon:</strong> {HACKATHON_DATE}.</p>'
        f'<p>Os próximos passos serão comunicados em breve pela organização.</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p>Agradecemos pela inscrição da equipe <strong>{team.name}</strong> no '
        f'Hackathon da Liga de TI.</p>'
        f'<p>Após análise, informamos que a equipe não foi selecionada nesta edição.</p>'
        f'<p>Continuem desenvolvendo seus projetos — esperamos vocês nas próximas edições!</p>'
        f'<p>Liga de TI</p>'
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
    html = (
        f'<p>Olá, <strong>{participant.full_name}</strong>.</p>'
        f'<p>O prazo para formação de equipes encerrou em <strong>{_deadline()}</strong>.</p>'
        f'<p>A equipe <strong>{team.name}</strong> não atingiu 4 membros e foi '
        f'descartada automaticamente.</p>'
        f'<p>Esperamos vocês nas próximas edições!</p>'
        f'<p>Liga de TI</p>'
    )
    _send(subject, text, html, [participant.user.email])
