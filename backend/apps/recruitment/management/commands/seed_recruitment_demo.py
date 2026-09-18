"""Cria um processo seletivo completo para inspeção manual.

Serve para navegar pelo Django Admin e conferir se o modelo de dados
corresponde ao que a Liga espera, antes de existir interface.

Não dispara e-mail: cria as candidaturas direto no banco, sem passar pelos
services de notificação.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.recruitment.blueprint import (
    PROCESS_DESCRIPTION,
    PROCESS_NAME,
    STAGES,
)
from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    Evaluation,
    EvaluationCriterion,
    OrganizerProfile,
    Process,
    ProcessStatus,
    Stage,
)
from apps.teams.models import Participant

User = get_user_model()

# Janelas relativas a agora, só para a demo: a etapa do Case fica aberta para
# dar o que testar no upload. Nome, peso, critérios e regras de arquivo vêm do
# blueprint — duplicar o barema aqui o faria envelhecer em um lugar só.
WINDOWS = {
    'Inscrição': (-14, -7),
    'Resolução do Case': (-3, 4),
    'Pitch': (7, 8),
    'Entrevista': (12, 14),
}

# (email, nome, cargo, e_coordenador) — o planejamento preve 1 coordenador
# e os demais como avaliadores.
ORGANIZERS = [
    ('bruno.reitano@liga.dev', 'Bruno Reitano', 'Diretor de Operações', True),
    ('marina.alves@liga.dev', 'Marina Alves', 'Diretora de Projetos', False),
]

CANDIDATES = [
    ('ana.lima@aluno.dev', 'Ana Lima', 'Ciência da Computação', 4, 'Pitch'),
    ('joao.silva@aluno.dev', 'João Silva', 'Engenharia de Software', 6, 'Pitch'),
    ('carla.souza@aluno.dev', 'Carla Souza', 'Sistemas de Informação', 3, 'Resolução do Case'),
    ('diego.rocha@aluno.dev', 'Diego Rocha', 'Ciência da Computação', 8, 'Resolução do Case'),
    ('paula.dias@aluno.dev', 'Paula Dias', 'Engenharia de Software', 2, 'Inscrição'),
    ('rafael.melo@aluno.dev', 'Rafael Melo', 'Ciência da Computação', 5, 'Entrevista'),
    ('luiza.castro@aluno.dev', 'Luiza Castro', 'Sistemas de Informação', 7, 'Inscrição'),
]

# Candidatos já finalizados, para a tela ter todos os status
FINISHED = {
    'rafael.melo@aluno.dev': ApplicationStatus.APPROVED,
    'luiza.castro@aluno.dev': ApplicationStatus.REJECTED,
}

# (email do candidato, etapa, {critério: [nota do avaliador 1, nota do avaliador 2]})
SCORES = {
    'ana.lima@aluno.dev': {
        'Resolução do Case': {
            'Compreensão do problema': [5, 4],
            'Pensamento crítico': [5, 4],
            'Qualidade da solução': [4, 5],
            'Viabilidade': [4, 4],
            'Justificativa das decisões': [5, 4],
            'Estrutura e clareza': [4, 5],
            'Criatividade e iniciativa': [5, 5],
        },
    },
    'joao.silva@aluno.dev': {
        'Resolução do Case': {
            'Compreensão do problema': [3, 3],
            'Pensamento crítico': [4, 2],
            'Qualidade da solução': [3, 3],
            'Viabilidade': [4, 3],
            'Justificativa das decisões': [3, 2],
            'Estrutura e clareza': [4, 4],
            'Criatividade e iniciativa': [3, 3],
        },
    },
}


class Command(BaseCommand):
    help = 'Cria um processo seletivo de demonstração, com etapas e candidatos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Remove o processo de demo anterior antes de criar outro.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            # Ordem importa: Application.current_stage é PROTECT, então o
            # processo não pode ser apagado enquanto houver candidatura
            # apontando para uma etapa dele. As avaliações caem junto com a
            # candidatura (CASCADE), e etapas e critérios caem com o processo.
            process = Process.objects.filter(name=PROCESS_NAME).first()
            if process:
                removed, _ = Application.objects.filter(process=process).delete()
                process.delete()
                self.stdout.write(
                    f'Processo de demo anterior removido ({removed} registros '
                    f'de candidatura).'
                )

        process = self._create_process()
        stages = self._create_stages(process)
        organizers = self._create_organizers()
        applications = self._create_applications(process, stages)
        self._create_evaluations(applications, stages, organizers)

        self.stdout.write(self.style.SUCCESS(f'\n{process.name}'))
        self.stdout.write(f'  status:      {process.status}')
        self.stdout.write(f'  etapas:      {len(stages)}')
        self.stdout.write(f'  candidatos:  {len(applications)}')
        self.stdout.write(f'  avaliações:  {Evaluation.objects.count()}')
        self.stdout.write(
            f'  organizadores: {", ".join(o.get_username() for o in organizers)}'
        )
        self.stdout.write(
            '\nSenha de todos os usuários de demo: liga@2026'
            '\nVeja em http://localhost:8000/admin/recruitment/\n'
        )

    def _create_process(self):
        now = timezone.now()
        process, _ = Process.objects.get_or_create(
            name=PROCESS_NAME,
            defaults={
                'description': PROCESS_DESCRIPTION,
                'status': ProcessStatus.PUBLISHED,
                'registration_start': now - timedelta(days=14),
                'registration_end': now + timedelta(days=7),
                'published_at': now - timedelta(days=14),
                'highlight_message': 'Inscrições abertas!',
            },
        )
        return process

    def _create_stages(self, process):
        # Janelas relativas a agora: a etapa do Case fica aberta, as anteriores
        # encerradas e as seguintes no futuro. Calcular a partir do início das
        # inscrições fazia o Case vencer no instante em que o seed rodava.
        now = timezone.now()
        stages = {}
        for order, data in enumerate(STAGES, start=1):
            opens, closes = WINDOWS[data['name']]
            stage, _ = Stage.objects.get_or_create(
                process=process,
                order=order,
                defaults={
                    'name': data['name'],
                    'description': data['description'],
                    'start_at': now + timedelta(days=opens),
                    'end_at': now + timedelta(days=closes),
                    'weight': data['weight'],
                    'allows_file_upload': data.get('allows_file_upload', False),
                    'max_files': data.get('max_files'),
                    'allowed_file_types': data.get('allowed_file_types', []),
                },
            )
            for criterion_order, (name, weight) in enumerate(data['criteria'], start=1):
                EvaluationCriterion.objects.get_or_create(
                    stage=stage,
                    name=name,
                    defaults={'order': criterion_order, 'weight': weight},
                )
            stages[data['name']] = stage
        return stages

    def _user(self, email, full_name):
        user, created = User.objects.get_or_create(
            email=email, defaults={'username': email}
        )
        if created:
            user.set_password('liga@2026')
            user.save()
        return user

    def _create_organizers(self):
        organizers = []
        for email, full_name, role, is_coordinator in ORGANIZERS:
            user = self._user(email, full_name)
            if not user.is_staff:
                user.is_staff = True
                user.save(update_fields=['is_staff'])
            OrganizerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'full_name': full_name,
                    'role_title': role,
                    'is_coordinator': is_coordinator,
                },
            )
            organizers.append(user)
        return organizers

    def _create_applications(self, process, stages):
        applications = {}
        for index, (email, full_name, course, semester, stage_name) in enumerate(
            CANDIDATES, start=1
        ):
            user = self._user(email, full_name)
            participant, _ = Participant.objects.get_or_create(
                user=user,
                defaults={
                    'full_name': full_name,
                    'course': course,
                    'semester': semester,
                    'bio': f'Candidato do {course}, {semester}º semestre.',
                },
            )
            application, _ = Application.objects.get_or_create(
                process=process,
                participant=participant,
                defaults={
                    'current_stage': stages[stage_name],
                    'status': FINISHED.get(email, ApplicationStatus.IN_PROGRESS),
                    'code': f'C-{index:04d}',
                    'submitted_at': process.registration_start + timedelta(days=1),
                },
            )
            applications[email] = application
        return applications

    def _create_evaluations(self, applications, stages, organizers):
        for email, by_stage in SCORES.items():
            application = applications[email]
            for stage_name, criteria in by_stage.items():
                stage = stages[stage_name]
                for criterion_name, scores in criteria.items():
                    criterion = EvaluationCriterion.objects.get(
                        stage=stage, name=criterion_name
                    )
                    for evaluator, score in zip(organizers, scores):
                        Evaluation.objects.get_or_create(
                            application=application,
                            criterion=criterion,
                            evaluator=evaluator,
                            defaults={'stage': stage, 'score': score},
                        )
