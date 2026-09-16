"""Baixa uma cópia local dos entregáveis de um processo.

Os arquivos vivem num volume do Railway, que persiste entre deploys mas cujo
backup é responsabilidade da Liga. Os cases são a entrega que não pode ser
perdida — rode isto ao fim de cada etapa de entrega.
"""

import os
import shutil

from django.core.management.base import BaseCommand, CommandError

from apps.recruitment.models import Deliverable, Process


class Command(BaseCommand):
    help = 'Exporta os entregáveis de um processo para um diretório local.'

    def add_arguments(self, parser):
        parser.add_argument('--process', help='ID ou parte do nome do processo.')
        parser.add_argument(
            '--out',
            default='deliverables_export',
            help='Diretório de destino (padrão: deliverables_export).',
        )
        parser.add_argument(
            '--stage', help='Exporta só uma etapa, pelo nome.', default=None
        )

    def handle(self, *args, **options):
        process = self._find_process(options.get('process'))
        deliverables = Deliverable.objects.filter(
            application__process=process
        ).select_related('application', 'application__participant', 'stage')

        if options.get('stage'):
            deliverables = deliverables.filter(stage__name__icontains=options['stage'])

        if not deliverables.exists():
            self.stdout.write(self.style.WARNING('Nenhum entregável encontrado.'))
            return

        out_dir = options['out']
        exported, missing = 0, []

        for deliverable in deliverables:
            application = deliverable.application
            # Pasta por etapa, arquivo prefixado pelo código da candidatura —
            # assim a exportação serve para correção anônima também.
            stage_dir = os.path.join(out_dir, self._slug(deliverable.stage.name))
            os.makedirs(stage_dir, exist_ok=True)

            base = os.path.basename(deliverable.file.name)
            code = application.code or str(application.id)[:8]
            destination = os.path.join(stage_dir, f'{code}__{base}')

            try:
                with deliverable.file.open('rb') as source, open(
                    destination, 'wb'
                ) as target:
                    shutil.copyfileobj(source, target)
                exported += 1
            except (OSError, ValueError):
                missing.append(f'{code} — {base}')

        self.stdout.write(
            self.style.SUCCESS(f'\n{exported} arquivo(s) exportado(s) para {out_dir}/')
        )
        if missing:
            self.stdout.write(
                self.style.ERROR(
                    f'{len(missing)} arquivo(s) não encontrados no storage:'
                )
            )
            for item in missing:
                self.stdout.write(f'  - {item}')

    def _find_process(self, term):
        if not term:
            raise CommandError('Informe --process com o ID ou parte do nome.')

        process = Process.objects.filter(name__icontains=term).first()
        if process is None:
            process = Process.objects.filter(id__iexact=term).first()
        if process is None:
            raise CommandError(f'Processo não encontrado: {term}')
        return process

    def _slug(self, text):
        return (
            text.lower()
            .replace(' ', '_')
            .replace('ç', 'c')
            .replace('ã', 'a')
            .replace('á', 'a')
            .replace('é', 'e')
            .replace('í', 'i')
            .replace('ó', 'o')
            .replace('ú', 'u')
        )
