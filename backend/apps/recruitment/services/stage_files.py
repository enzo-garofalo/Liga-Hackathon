"""Enunciado em arquivo: o PDF que o organizador anexa a uma etapa.

Separado de `deliverables.py` de propósito: lá o arquivo é do candidato e o
organizador lê; aqui é o contrário. As regras de quem pode ver são opostas.
"""

import os

from rest_framework.exceptions import ValidationError

from apps.recruitment.models import Application
from apps.recruitment.services.applications import has_reached
from apps.recruitment.services.deliverables import max_upload_bytes

ALLOWED_EXTENSIONS = ['pdf']


def _extension(filename):
    return os.path.splitext(filename)[1].lstrip('.').lower()


def assert_upload_allowed(uploaded_file):
    extension = _extension(uploaded_file.name)
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f'Formato .{extension} não aceito. O enunciado é um PDF.'
        )

    limit = max_upload_bytes()
    if uploaded_file.size > limit:
        raise ValidationError(
            f'O arquivo excede o limite de {limit // (1024 * 1024)} MB.'
        )


def set_file(stage, uploaded_file):
    """Anexa o enunciado, trocando o anterior.

    O arquivo antigo sai do disco junto: sem isso, cada troca de enunciado
    deixaria uma cópia órfã no volume, que ninguém alcança e ninguém apaga.
    """
    assert_upload_allowed(uploaded_file)
    if stage.instructions_file:
        stage.instructions_file.delete(save=False)
    stage.instructions_file = uploaded_file
    stage.save(update_fields=['instructions_file', 'updated_at'])
    return stage


def clear_file(stage):
    if not stage.instructions_file:
        raise ValidationError('Esta etapa não tem enunciado anexado.')
    stage.instructions_file.delete(save=False)
    stage.instructions_file = ''
    stage.save(update_fields=['instructions_file', 'updated_at'])
    return stage


def can_download(stage, user):
    """Organizador sempre; candidato só depois de chegar na etapa.

    O enunciado do case é a prova. Liberá-lo a qualquer candidato autenticado
    daria dias de vantagem a quem soubesse montar a URL.
    """
    if user.is_staff:
        return True

    participant = getattr(user, 'participant', None)
    if participant is None:
        return False

    application = Application.objects.filter(
        process_id=stage.process_id, participant=participant
    ).select_related('current_stage').first()
    return bool(application and has_reached(application, stage))


def filename(stage):
    return os.path.basename(stage.instructions_file.name) if stage.instructions_file else ''


def download_url(stage):
    if not stage.instructions_file:
        return None
    return f'/api/v1/stages/{stage.id}/instructions-file/download/'
