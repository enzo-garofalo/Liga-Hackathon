"""Quem é quem entre os organizadores.

Dois cargos, e a diferença é real, não decorativa (decisions.md §29):

- **Coordenador** (`OrganizerProfile.is_coordinator`, ou superusuário) monta o
  processo, chama quem vai ajudar, distribui as correções e decide resultado.
- **Avaliador** entra num processo a convite do coordenador e faz uma coisa só:
  dar nota no que lhe foi distribuído. Não aprova, não reprova, não move de
  etapa, não descarta, não escreve comunicado e não edita o processo.

Tudo que dispara e-mail para candidato ou muda o rumo de alguém é do
coordenador. O avaliador opina; quem decide é quem organiza.
"""

from rest_framework.permissions import BasePermission

from apps.recruitment.models import (
    Process,
    ProcessOrganizer,
    StageAssignment,
)


def is_coordinator(user):
    """Coordenador do processo, para efeito de correção anônima e designação.

    Superusuário conta como coordenador: é quem administra a instalação, e sem
    isso ficaria sem enxergar a identidade de candidato nenhum — não há tela
    para marcar `is_coordinator` ainda (decisions.md §12).
    """
    if getattr(user, 'is_superuser', False):
        return True
    profile = getattr(user, 'organizer_profile', None)
    return bool(profile and profile.is_coordinator)


def is_member(user, process):
    """Avaliador chamado para este processo."""
    if not getattr(user, 'is_authenticated', False):
        return False
    return ProcessOrganizer.objects.filter(process=process, user=user).exists()


def can_open_process(user, process):
    """Quem consegue abrir a tela deste processo na área do organizador."""
    if not getattr(user, 'is_staff', False):
        return False
    return is_coordinator(user) or is_member(user, process)


def visible_processes(user):
    """Processos que aparecem para este organizador.

    O coordenador vê todos. O avaliador vê só aqueles em que foi posto: sem
    isto, quem foi chamado para corrigir um case enxergaria processo de outra
    edição inteiro, com nome e nota de gente que não tem nada com ele.
    """
    if is_coordinator(user):
        return Process.objects.all()
    return Process.objects.filter(organizers__user=user)


def assigned_application_ids(user, process):
    """Candidaturas deste processo distribuídas a este avaliador.

    Vale para qualquer etapa: se o coordenador distribuiu o case e também o
    pitch, as duas filas somam. Devolve `None` para coordenador, que não tem
    fila — ele vê o processo inteiro.
    """
    if is_coordinator(user):
        return None
    return set(
        StageAssignment.objects.filter(
            stage__process=process, evaluator=user
        ).values_list('application_id', flat=True)
    )


def can_evaluate(user, application, stage):
    """Pode salvar nota desta candidatura nesta etapa?

    A trava da designação volta a valer para quem não é coordenador, agora que
    existe tela para distribuir. A §19 tinha tirado a trava justamente porque
    não havia tela, e o avaliador ficava sem conseguir salvar nota nenhuma sem
    caminho para resolver.
    """
    if is_coordinator(user):
        return True
    return StageAssignment.objects.filter(
        stage=stage, application=application, evaluator=user
    ).exists()


class IsCoordinator(BasePermission):
    """Fecha o endpoint para quem não coordena.

    A mensagem diz o cargo, e não "sem permissão": o avaliador precisa entender
    que aquilo é do coordenador, não que a conta dele está quebrada.
    """

    message = 'Esta ação é do coordenador do processo.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            getattr(user, 'is_authenticated', False)
            and user.is_staff
            and is_coordinator(user)
        )
