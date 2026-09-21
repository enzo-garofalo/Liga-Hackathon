"""Quem o coordenador chama para ajudar num processo.

O convite não cria tabela de convite. A conta nasce sem senha utilizável e a
pessoa recebe o mesmo link do "esqueci minha senha", que vale uma vez e morre
quando ela escolhe a senha: o coordenador nunca inventa nem enxerga senha de
ninguém, e não sobra estado pendente para alguém limpar depois.

"Convite pendente" também não é campo: é a conta que ainda está sem senha
utilizável. Um campo diria a mesma coisa e poderia discordar da realidade.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import models, transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.exceptions import ValidationError

from apps.recruitment import tasks
from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    OrganizerProfile,
    ProcessOrganizer,
    StageAssignment,
)
from apps.teams.services import password_reset

User = get_user_model()


def conta_com(email):
    return User.objects.filter(
        models.Q(email__iexact=email) | models.Q(username__iexact=email)
    ).first()


def link_de_convite(user):
    """Endereço para o convidado escolher a primeira senha.

    É o link da redefinição de senha com `convite=1` pendurado: a tela é a
    mesma, só troca o texto, porque criar a primeira senha e trocar a antiga
    são a mesma operação do ponto de vista da conta.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return password_reset.montar_link(uid, token, 'organizador') + '&convite=1'


def esta_pendente(user):
    """Convidado que ainda não criou a senha."""
    return not user.has_usable_password()


def _disparar_convite(user, process):
    """E-mail do convite, depois que a transação fecha.

    Fora da transação de propósito: se a gravação falhar no fim, ninguém recebe
    convite para um processo em que não entrou.
    """
    link = link_de_convite(user) if esta_pendente(user) else ''
    transaction.on_commit(
        lambda user_id=user.pk, process_id=process.pk, url=link: (
            tasks.send_organizer_invite.delay(user_id, str(process_id), url)
        )
    )


def _assert_nao_e_candidato(user, process):
    """Ninguém corrige o próprio case.

    Bloqueia só neste processo: ter se candidatado numa edição passada não
    impede de ajudar nesta.
    """
    participant = getattr(user, 'participant', None)
    if participant is None:
        return
    disputando = Application.objects.filter(
        process=process, participant=participant
    ).exclude(status=ApplicationStatus.WITHDRAWN).exists()
    if disputando:
        raise ValidationError(
            'Esta pessoa é candidata neste processo e não pode entrar como '
            'organizadora dele.'
        )


@transaction.atomic
def invite(process, email, full_name='', role_title='', invited_by=None):
    """Chama alguém para ajudar neste processo, como avaliador.

    Quem entra por aqui nunca vira coordenador: `is_coordinator` continua sendo
    marcado à mão no Django Admin. Coordenação não se delega por formulário.
    """
    email = (email or '').strip().lower()
    if not email:
        raise ValidationError('Informe o e-mail de quem você quer chamar.')

    user = conta_com(email)
    if user is None:
        # Sem senha: quem escolhe é a pessoa, pelo link do convite.
        user = User.objects.create_user(username=email, email=email)
    if not user.is_active:
        raise ValidationError('A conta deste e-mail está desativada.')

    _assert_nao_e_candidato(user, process)

    if not user.is_staff:
        user.is_staff = True
        user.save(update_fields=['is_staff'])

    OrganizerProfile.objects.get_or_create(
        user=user,
        defaults={'full_name': full_name.strip(), 'role_title': role_title.strip()},
    )

    membership, criado = ProcessOrganizer.objects.get_or_create(
        process=process, user=user, defaults={'invited_by': invited_by}
    )
    if not criado:
        raise ValidationError('Esta pessoa já está neste processo.')

    _disparar_convite(user, process)
    return membership


def resend(process, user):
    """Manda o convite de novo, para quem perdeu o e-mail.

    O link antigo continua valendo enquanto não for usado: o token é o mesmo
    para a mesma senha, então reenviar não invalida o que já foi mandado.
    """
    if not ProcessOrganizer.objects.filter(process=process, user=user).exists():
        raise ValidationError('Esta pessoa não está neste processo.')
    _disparar_convite(user, process)


@transaction.atomic
def remove(process, user):
    """Tira a pessoa do processo.

    As designações dela caem junto, senão ela continuaria aparecendo na carga
    de trabalho da etapa e voltaria a enxergar candidatos se fosse readmitida.

    As notas que ela já deu **ficam**: foram trabalho feito e entram na média
    da etapa. Apagá-las mudaria a nota de candidatos sem que ninguém pedisse.
    """
    membership = ProcessOrganizer.objects.filter(process=process, user=user).first()
    if membership is None:
        raise ValidationError('Esta pessoa não está neste processo.')

    StageAssignment.objects.filter(stage__process=process, evaluator=user).delete()
    membership.delete()


def _linha(user, coordena, carga, entrou_em=None):
    profile = getattr(user, 'organizer_profile', None)
    return {
        'id': str(getattr(profile, 'id', '')) or f'user-{user.pk}',
        'user_id': user.pk,
        'email': user.email or user.get_username(),
        'full_name': (profile.full_name if profile else '') or '',
        'role_title': (profile.role_title if profile else '') or '',
        'is_coordinator': coordena,
        'pending': esta_pendente(user),
        'workload': carga.get(user.pk, 0),
        'created_at': entrou_em,
    }


def coordenadores():
    """Quem coordena a instalação, e por isso coordena todo processo.

    Não há coordenador "de um processo": `is_coordinator` e superusuário valem
    em qualquer um (roles.visible_processes). Por isso a coordenação não entra
    em `ProcessOrganizer`: ela não é chamada, já está.
    """
    return User.objects.filter(is_staff=True).filter(
        models.Q(organizer_profile__is_coordinator=True) | models.Q(is_superuser=True)
    ).select_related('organizer_profile').order_by('pk')


def members(process):
    """Organizadores deste processo: a coordenação, mais quem foi chamado.

    A coordenação aparece porque esta lista é também de quem pode entrar no
    rodízio da correção. Sem ela, o coordenador não conseguiria se incluir na
    própria distribuição, que é justamente como a Liga corrige hoje.
    """
    carga = workload_by_user(process)
    linhas = []
    vistos = set()

    for user in coordenadores():
        linhas.append(_linha(user, coordena=True, carga=carga))
        vistos.add(user.pk)

    memberships = (
        ProcessOrganizer.objects.filter(process=process)
        .select_related('user', 'user__organizer_profile')
        .order_by('created_at')
    )
    for membership in memberships:
        if membership.user_id in vistos:
            continue
        linhas.append(
            _linha(
                membership.user,
                coordena=False,
                carga=carga,
                entrou_em=membership.created_at,
            )
        )
    return linhas


def workload_by_user(process):
    """Quantas correções cada organizador tem neste processo, somando as etapas."""
    counts = {}
    for evaluator_id in StageAssignment.objects.filter(
        stage__process=process
    ).values_list('evaluator_id', flat=True):
        counts[evaluator_id] = counts.get(evaluator_id, 0) + 1
    return counts
