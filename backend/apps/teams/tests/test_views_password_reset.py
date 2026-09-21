"""Esqueci minha senha: pedir o link e usar o link.

Dois pontos sustentam o resto: o pedido não conta a ninguém quais e-mails têm
conta, e o link só serve uma vez, para quem o recebeu na caixa de entrada.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.throttling import ScopedRateThrottle

from .factories import ParticipantFactory, UserFactory

pytestmark = pytest.mark.django_db

User = get_user_model()

PEDIR_URL = '/api/v1/auth/password-reset/'
CONFIRMAR_URL = '/api/v1/auth/password-reset/confirm/'
TOKEN_URL = '/api/v1/auth/token/'
ADMIN_TOKEN_URL = '/api/v1/auth/admin/token/'

SENHA_ORIGINAL = 'strongpass123'
SENHA_NOVA = 'senhaNova#2026'


@pytest.fixture(autouse=True)
def limpa_throttle():
    """O contador do throttle vive no cache e atravessaria os testes.

    Sem isto, a ordem da suíte decide quem recebe 429: os testes passam
    sozinhos e falham juntos.
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def conta(participant):
    """Participante com senha de verdade gravada no banco.

    A UserFactory chama `set_password` mas não salva (`skip_postgeneration_save`),
    então no banco a senha fica vazia. Sem esta fixture, o teste de "a senha
    antiga parou de valer" passaria sozinho: não havia senha antiga valendo.
    """
    participant.user.set_password(SENHA_ORIGINAL)
    participant.user.save(update_fields=['password'])
    return participant


def senha_guardada(user):
    """O hash como está no banco, para conferir que uma recusa não mexeu nele."""
    return User.objects.get(pk=user.pk).password


def link_do_email():
    """O endereço de redefinição que saiu no último e-mail."""
    corpo = mail.outbox[-1].body
    for pedaco in corpo.split():
        if '/reset-password?' in pedaco:
            return pedaco
    raise AssertionError('nenhum link de redefinição no e-mail: ' + corpo)


def partes_do_link(url):
    query = url.split('?', 1)[1]
    return dict(parte.split('=', 1) for parte in query.split('&'))


# ── Pedido do link ────────────────────────────────────────────────


def test_pedido_envia_o_email_para_quem_tem_conta(api_client, participant):
    r = api_client.post(PEDIR_URL, {'email': participant.user.email}, format='json')

    assert r.status_code == 200
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [participant.user.email]
    assert 'reset-password' in mail.outbox[0].body


def test_pedido_de_email_desconhecido_responde_igual_e_nao_envia(api_client, participant):
    """A resposta não pode dizer quem tem conta na Liga."""
    conhecido = api_client.post(PEDIR_URL, {'email': participant.user.email}, format='json')
    mail.outbox.clear()

    desconhecido = api_client.post(PEDIR_URL, {'email': 'ninguem@x.com'}, format='json')

    assert desconhecido.status_code == conhecido.status_code == 200
    assert desconhecido.data == conhecido.data
    assert mail.outbox == []


def test_organizador_sem_cadastro_de_candidato_tambem_recebe(api_client):
    UserFactory(username='org@liga.dev', is_staff=True)

    r = api_client.post(PEDIR_URL, {'email': 'org@liga.dev'}, format='json')

    assert r.status_code == 200
    assert len(mail.outbox) == 1


def test_conta_desativada_nao_recebe_link(api_client, participant):
    participant.user.is_active = False
    participant.user.save(update_fields=['is_active'])

    r = api_client.post(PEDIR_URL, {'email': participant.user.email}, format='json')

    assert r.status_code == 200
    assert mail.outbox == []


def test_email_invalido_e_recusado(api_client):
    r = api_client.post(PEDIR_URL, {'email': 'nao-e-email'}, format='json')

    assert r.status_code == 400
    assert mail.outbox == []


def test_link_usa_o_endereco_do_frontend(api_client, participant, settings):
    settings.FRONTEND_URL = 'https://ps.ligadeti.com.br'

    api_client.post(PEDIR_URL, {'email': participant.user.email}, format='json')

    assert link_do_email().startswith('https://ps.ligadeti.com.br/reset-password?uid=')


def test_link_do_candidato_diz_que_a_porta_e_a_do_candidato(api_client, participant):
    api_client.post(PEDIR_URL, {'email': participant.user.email}, format='json')

    assert partes_do_link(link_do_email())['area'] == 'candidato'


def test_link_do_organizador_diz_que_a_porta_e_a_da_organizacao(api_client):
    """Quem abre o link e desiste precisa voltar pela porta certa.

    O login de candidato recusa a conta do organizador, que não tem
    `Participant`: sem esta marca, o caminho de volta levava a um erro.
    """
    UserFactory(username='org2@liga.dev', is_staff=True)
    api_client.post(PEDIR_URL, {'email': 'org2@liga.dev'}, format='json')

    assert partes_do_link(link_do_email())['area'] == 'organizador'


def test_pedido_em_excesso_e_barrado(api_client, participant, monkeypatch):
    """Endpoint aberto que dispara e-mail precisa de teto.

    A taxa é trocada na própria classe de throttle: `settings.REST_FRAMEWORK`
    não alcança a tabela que o DRF leu na importação, e o teste passaria sem
    nunca ter havido limite.
    """
    monkeypatch.setattr(ScopedRateThrottle, 'THROTTLE_RATES', {'password_reset': '3/hour'})

    codigos = [
        api_client.post(PEDIR_URL, {'email': participant.user.email}, format='json').status_code
        for _ in range(4)
    ]

    assert codigos[:3] == [200, 200, 200]
    assert codigos[3] == 429


# ── Uso do link ───────────────────────────────────────────────────


@pytest.fixture
def link(api_client, conta):
    # Depende de `conta` de propósito: o token é assinado com o hash da senha,
    # e gravar a senha depois de pedir o link invalidaria o link.
    api_client.post(PEDIR_URL, {'email': conta.user.email}, format='json')
    return partes_do_link(link_do_email())


def test_link_troca_a_senha_e_a_nova_entra(api_client, conta, link):
    r = api_client.post(CONFIRMAR_URL, {**link, 'password': SENHA_NOVA}, format='json')

    assert r.status_code == 200
    login = api_client.post(
        TOKEN_URL,
        {'email': conta.user.email, 'password': SENHA_NOVA},
        format='json',
    )
    assert login.status_code == 200


def test_senha_antiga_para_de_valer(api_client, conta, link):
    api_client.post(CONFIRMAR_URL, {**link, 'password': SENHA_NOVA}, format='json')

    login = api_client.post(
        TOKEN_URL,
        {'email': conta.user.email, 'password': SENHA_ORIGINAL},
        format='json',
    )
    assert login.status_code == 401


def test_o_mesmo_link_nao_serve_duas_vezes(api_client, link):
    """Trocar a senha invalida o token: ele é assinado com o hash da senha."""
    api_client.post(CONFIRMAR_URL, {**link, 'password': SENHA_NOVA}, format='json')

    segunda = api_client.post(
        CONFIRMAR_URL, {**link, 'password': 'outraSenha#2026'}, format='json'
    )

    assert segunda.status_code == 400


def test_token_adulterado_e_recusado(api_client, conta, link):
    antes = senha_guardada(conta.user)
    adulterado = {**link, 'token': link['token'][:-3] + 'abc', 'password': SENHA_NOVA}

    r = api_client.post(CONFIRMAR_URL, adulterado, format='json')

    assert r.status_code == 400
    assert senha_guardada(conta.user) == antes


def test_uid_de_outra_conta_nao_abre_com_o_token(api_client, link):
    """Trocar o uid mantendo o token não dá acesso à conta do vizinho."""
    outro = ParticipantFactory()

    r = api_client.post(
        CONFIRMAR_URL,
        {
            'uid': urlsafe_base64_encode(force_bytes(outro.user.pk)),
            'token': link['token'],
            'password': SENHA_NOVA,
        },
        format='json',
    )

    assert r.status_code == 400
    assert not User.objects.get(pk=outro.user.pk).check_password(SENHA_NOVA)


def test_uid_sem_sentido_e_recusado(api_client, link):
    r = api_client.post(
        CONFIRMAR_URL, {**link, 'uid': 'xxxx', 'password': SENHA_NOVA}, format='json'
    )
    assert r.status_code == 400


def test_senha_fraca_e_recusada_e_a_antiga_continua(api_client, conta, link):
    """A redefinição não pode ser a porta dos fundos para uma senha fraca."""
    antes = senha_guardada(conta.user)

    r = api_client.post(CONFIRMAR_URL, {**link, 'password': '12345678'}, format='json')

    assert r.status_code == 400
    assert senha_guardada(conta.user) == antes


def test_resposta_diz_por_qual_porta_entrar(api_client, link):
    r = api_client.post(CONFIRMAR_URL, {**link, 'password': SENHA_NOVA}, format='json')
    assert r.data['area'] == 'candidato'


def test_organizador_volta_para_a_area_da_organizacao(api_client):
    coordenador = UserFactory(username='coord@liga.dev', is_staff=True)
    coordenador.set_password(SENHA_ORIGINAL)
    coordenador.save(update_fields=['password'])
    api_client.post(PEDIR_URL, {'email': 'coord@liga.dev'}, format='json')
    link = partes_do_link(link_do_email())

    r = api_client.post(CONFIRMAR_URL, {**link, 'password': SENHA_NOVA}, format='json')

    assert r.status_code == 200
    assert r.data['area'] == 'organizador'
    login = api_client.post(
        ADMIN_TOKEN_URL, {'email': 'coord@liga.dev', 'password': SENHA_NOVA}, format='json'
    )
    assert login.status_code == 200


def test_confirmacao_nao_exige_estar_logado(api_client, link):
    """Quem esqueceu a senha está, por definição, do lado de fora."""
    api_client.credentials()

    r = api_client.post(CONFIRMAR_URL, {**link, 'password': SENHA_NOVA}, format='json')

    assert r.status_code == 200
