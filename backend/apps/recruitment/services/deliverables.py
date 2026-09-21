"""Entregáveis: upload e remoção pelo candidato."""

import os

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.recruitment.models import Deliverable, ProcessStatus

DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def max_upload_bytes():
    """Teto de tamanho por arquivo.

    O endpoint de upload é aberto a qualquer candidato autenticado, então sem
    limite alguém pode encher o volume. Lido a cada chamada, e não na
    importação, para o valor poder ser ajustado por ambiente.
    """
    return getattr(settings, 'MAX_UPLOAD_BYTES', DEFAULT_MAX_UPLOAD_BYTES)


def _extension(filename):
    return os.path.splitext(filename)[1].lstrip('.').lower()


def assert_owner(application, participant):
    if application.participant_id != participant.id:
        raise PermissionDenied('Esta candidatura não é sua.')


def assert_upload_allowed(application, stage, uploaded_file):
    """Todas as regras de entrega, na ordem em que o candidato as encontraria."""
    if application.process.status != ProcessStatus.PUBLISHED:
        raise ValidationError('Este processo não está aberto para entregas.')

    if application.is_finished:
        raise ValidationError('Sua candidatura já foi finalizada.')

    if not stage.allows_file_upload:
        raise ValidationError(f'A etapa {stage.name} não recebe arquivos.')

    if stage.end_at and timezone.now() > stage.end_at and not stage.accepts_late_submission:
        raise ValidationError(
            f'O prazo de entrega da etapa {stage.name} encerrou em '
            f'{timezone.localtime(stage.end_at).strftime("%d/%m/%Y às %H:%M")}.'
        )

    allowed = [ext.lower() for ext in (stage.allowed_file_types or [])]
    extension = _extension(uploaded_file.name)
    if allowed and extension not in allowed:
        raise ValidationError(
            f'Formato .{extension} não aceito. Envie: {", ".join(allowed)}.'
        )

    limit = max_upload_bytes()
    if uploaded_file.size > limit:
        raise ValidationError(
            f'O arquivo excede o limite de {limit // (1024 * 1024)} MB.'
        )

    if stage.max_files is not None:
        sent = Deliverable.objects.filter(application=application, stage=stage).count()
        if sent >= stage.max_files:
            raise ValidationError(
                f'Limite de {stage.max_files} arquivo(s) nesta etapa já atingido. '
                f'Remova um antes de enviar outro.'
            )


def upload(application, stage, uploaded_file):
    assert_upload_allowed(application, stage, uploaded_file)
    return Deliverable.objects.create(
        application=application, stage=stage, file=uploaded_file
    )


def delete(deliverable):
    """Remoção só antes do prazo — depois disso a entrega está avaliada."""
    stage = deliverable.stage
    if stage.end_at and timezone.now() > stage.end_at:
        raise ValidationError(
            'O prazo da etapa encerrou e a entrega não pode mais ser removida.'
        )
    deliverable.file.delete(save=False)
    deliverable.delete()


def can_download(deliverable, user):
<<<<<<< HEAD
    """Dono do arquivo ou organizador.

    Os arquivos não ficam em URL pública: são material de candidatura e o
    caminho seria adivinhável. Todo acesso passa por esta checagem.
    """
    if user.is_staff:
        return True
    participant = getattr(user, 'participant', None)
    return bool(participant and deliverable.application.participant_id == participant.id)
=======
    """Dono do arquivo, coordenador, ou avaliador que pegou esta candidatura.

    Os arquivos não ficam em URL pública: são material de candidatura e o
    caminho seria adivinhável. Todo acesso passa por esta checagem.

    Ser organizador não basta: o avaliador baixa o que lhe foi distribuído, e
    mais nada. Deixar todo `is_staff` baixar tudo tornaria a fila decorativa,
    já que o arquivo é justamente o que se quer ver (decisions.md §29).
    """
    from apps.recruitment.models import StageAssignment
    from apps.recruitment.services.roles import is_coordinator

    if is_coordinator(user):
        return True
    if getattr(user, 'is_staff', False):
        return StageAssignment.objects.filter(
            application_id=deliverable.application_id, evaluator=user
        ).exists()
    participant = getattr(user, 'participant', None)
    return bool(participant and deliverable.application.participant_id == participant.id)


def display_name(deliverable, hidden):
    """Nome do arquivo como este leitor pode vê-lo.

    Numa etapa anônima o nome original entrega a pessoa: "case-pedro-xavier.pdf"
    derruba o anonimato sem que ninguém perceba, porque ninguém pensa no nome
    do arquivo como dado de identificação. Sobra o código e a extensão.
    """
    nome = os.path.basename(deliverable.file.name)
    if not hidden:
        return nome
    extensao = os.path.splitext(nome)[1]
    return (deliverable.application.code or 'Candidato') + extensao
>>>>>>> feature/v3-processo-seletivo
