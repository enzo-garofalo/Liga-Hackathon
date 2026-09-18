"""Garante que o processo seletivo da Liga exista, com etapas e barema.

Roda no `entrypoint.sh`, junto com as migrations, pela mesma razão do superusuário:
subir um ambiente novo e encontrar a tela do organizador vazia obriga a recriar o
processo à mão toda vez, e recriar à mão é onde o barema erra.

É idempotente e **não altera processo que já existe**. Isso é intencional: o comando
roda a cada deploy, e sobrescrever datas ou pesos desfaria, sem aviso, o que o
organizador tivesse ajustado pela interface.

O processo nasce como rascunho. Publicar abre as inscrições para gente de verdade —
é decisão do organizador, por "Abrir inscrições", não efeito colateral de um deploy.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.recruitment.blueprint import (
    PROCESS_DESCRIPTION,
    PROCESS_NAME,
    STAGES,
)
from apps.recruitment.models import (
    EvaluationCriterion,
    Process,
    ProcessStatus,
    Stage,
)


class Command(BaseCommand):
    help = 'Cria o processo seletivo padrão da Liga, se ainda não existir.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            default=PROCESS_NAME,
            help=f'Nome do processo (padrão: "{PROCESS_NAME}").',
        )
        parser.add_argument(
            '--registration-days',
            type=int,
            default=14,
            help='Duração da janela de inscrições em dias (padrão: 14).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        name = options['name']

        existing = Process.objects.filter(name=name).first()
        if existing:
            self.stdout.write(
                f'Processo "{name}" já existe ({existing.status}, '
                f'{existing.stages.count()} etapas) — nada a fazer.'
            )
            return

        process = self._create_process(name, options['registration_days'])
        stages = self._create_stages(process)

        self.stdout.write(self.style.SUCCESS(f'Processo "{name}" criado.'))
        self.stdout.write(f'  status: {process.status} (publique por "Abrir inscrições")')
        self.stdout.write(f'  etapas: {len(stages)}')
        for stage in stages:
            self.stdout.write(
                f'    {stage.order}. {stage.name} — peso {stage.weight:g}%, '
                f'{stage.criteria.count()} critérios'
            )
        self.stdout.write(
            '\nConfira as datas em "Editar processo" antes de abrir as inscrições.'
        )

    def _create_process(self, name, registration_days):
        now = timezone.now()
        return Process.objects.create(
            name=name,
            description=PROCESS_DESCRIPTION,
            status=ProcessStatus.DRAFT,
            registration_start=now,
            registration_end=now + timedelta(days=registration_days),
        )

    def _create_stages(self, process):
        # As etapas entram em sequência, cada uma começando quando a anterior
        # termina. São datas de partida: o organizador acerta na interface.
        cursor = process.registration_start
        stages = []
        for order, data in enumerate(STAGES, start=1):
            end = cursor + timedelta(days=data['duration_days'])
            stage = Stage.objects.create(
                process=process,
                order=order,
                name=data['name'],
                description=data['description'],
                start_at=cursor,
                end_at=end,
                weight=data['weight'],
                allows_file_upload=data.get('allows_file_upload', False),
                max_files=data.get('max_files'),
                allowed_file_types=data.get('allowed_file_types', []),
            )
            for criterion_order, (criterion_name, weight) in enumerate(
                data['criteria'], start=1
            ):
                EvaluationCriterion.objects.create(
                    stage=stage,
                    name=criterion_name,
                    order=criterion_order,
                    weight=weight,
                )
            stages.append(stage)
            cursor = end
        return stages
