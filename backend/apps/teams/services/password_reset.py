"""Redefinição de senha: pedir o link e usar o link.

O token é o `default_token_generator` do Django, que não guarda nada no banco.
Ele é assinado com a senha atual e o `last_login` da conta, e por isso deixa de
valer sozinho assim que a senha muda — o link serve uma vez só, sem tabela
nenhuma para limpar depois. Tabela nova também esbarraria na fronteira entre os
domínios (CLAUDE.md): `apps.teams` está em produção com o hackathon.

Vale para as duas portas de entrada, candidato e organizador: a conta é a mesma
`User`, só muda a tela em que a pessoa entra depois.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import models, transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import ValidationError

from apps.teams import tasks

logger = logging.getLogger(__name__)

User = get_user_model()

LINK_INVALIDO = (
    'Este link não vale mais: ele expira depois de algumas horas e também '
    'depois de usado uma vez. Peça um novo e-mail de redefinição.'
)


def contas_com(email):
    """Contas que devem receber o link deste endereço.

    Procura pelo e-mail e pelo usuário porque o cadastro grava o mesmo endereço
    nos dois campos, mas conta criada pelo `createsuperuser` pode ter só um dos
    dois preenchido. Sem endereço de e-mail não há para onde mandar, e sem senha
    utilizável não há o que redefinir.
    """
    return [
        user
        for user in User.objects.filter(
            models.Q(email__iexact=email) | models.Q(username__iexact=email),
            is_active=True,
        )
        if user.email and user.has_usable_password()
    ]


def montar_link(uid, token, area):
    base = settings.FRONTEND_URL.rstrip('/')
    return f'{base}/reset-password?uid={uid}&token={token}&area={area}'


def link_para(user):
    """O link do e-mail, já dizendo de qual porta é a conta.

    A `area` viaja no endereço para a tela saber para onde mandar quem abre o
    link e desiste: sem ela, o organizador que clicasse em "voltar" caía no
    login de candidato, que recusa a conta dele. Quem troca a senha até o fim
    não depende disto, porque a resposta da API traz a mesma informação.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return montar_link(uid, default_token_generator.make_token(user), area_de(user))


def enviar_link(email):
    """Dispara o e-mail, se houver conta. Silencioso quando não houver.

    Quem pede nunca fica sabendo se o endereço existe. Responder "não encontrei"
    transformaria a tela num consultor de quem é da Liga, aberto, sem login.
    """
    contas = contas_com(email)
    if not contas:
        logger.info('Redefinição de senha pedida para endereço sem conta.')
        return 0

    for user in contas:
        link = link_para(user)
        transaction.on_commit(
            lambda user_id=user.pk, url=link: tasks.send_password_reset.delay(user_id, url)
        )
    return len(contas)


def conta_do_uid(uid):
    try:
        return User.objects.get(pk=urlsafe_base64_decode(uid).decode())
    except (TypeError, ValueError, OverflowError, UnicodeDecodeError, User.DoesNotExist):
        return None


def conta_do_link(uid, token):
    """A conta do link, ou erro de validação se o link não serve mais."""
    user = conta_do_uid(uid)
    if user is None or not user.is_active:
        raise ValidationError(LINK_INVALIDO)
    if not default_token_generator.check_token(user, token):
        raise ValidationError(LINK_INVALIDO)
    return user


def trocar_senha(user, nova_senha):
    user.set_password(nova_senha)
    user.save(update_fields=['password'])
    return user


def area_de(user):
    """Para qual entrada mandar a pessoa depois de trocar a senha.

    Pelo perfil, e não por `is_staff`: quem organiza e também se candidatou
    entra pelas duas portas, e a de candidato é a que ela usa no dia a dia.
    É a mesma regra do login (ParticipantTokenObtainPairSerializer).
    """
    return 'candidato' if hasattr(user, 'participant') else 'organizador'
