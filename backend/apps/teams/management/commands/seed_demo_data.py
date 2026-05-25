from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.teams.models import Participant, Team, TeamMembership

User = get_user_model()

PARTICIPANTS = [
    {
        'email': 'ana.oliveira@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Ana Oliveira',
        'course': 'Ciência da Computação',
        'semester': 5,
        'bio': 'Desenvolvedora fullstack apaixonada por IA e sistemas distribuídos.',
        'github': 'https://github.com/ana-oliveira',
        'linkedin': 'https://linkedin.com/in/ana-oliveira',
    },
    {
        'email': 'bruno.santos@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Bruno Santos',
        'course': 'Engenharia de Software',
        'semester': 6,
        'bio': 'Backend com foco em Python e arquitetura de microsserviços.',
        'github': 'https://github.com/bruno-santos',
        'linkedin': None,
    },
    {
        'email': 'carla.melo@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Carla Melo',
        'course': 'Sistemas de Informação',
        'semester': 4,
        'bio': 'Interessada em UX e desenvolvimento mobile.',
        'github': None,
        'linkedin': 'https://linkedin.com/in/carla-melo',
    },
    {
        'email': 'diego.costa@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Diego Costa',
        'course': 'Ciência da Computação',
        'semester': 7,
        'bio': 'Pesquisador de machine learning e visão computacional.',
        'github': 'https://github.com/diego-costa',
        'linkedin': 'https://linkedin.com/in/diego-costa',
    },
    {
        'email': 'elena.ferreira@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Elena Ferreira',
        'course': 'Engenharia de Software',
        'semester': 3,
        'bio': 'Frontend com React e TypeScript. Ama design systems.',
        'github': 'https://github.com/elena-ferreira',
        'linkedin': 'https://linkedin.com/in/elena-ferreira',
    },
    {
        'email': 'fabio.lima@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Fabio Lima',
        'course': 'Redes de Computadores',
        'semester': 5,
        'bio': 'Especialista em infraestrutura e DevOps.',
        'github': 'https://github.com/fabio-lima',
        'linkedin': None,
    },
    {
        'email': 'gabriela.rocha@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Gabriela Rocha',
        'course': 'Ciência da Computação',
        'semester': 8,
        'bio': 'Desenvolvedora sênior com experiência em cloud e segurança.',
        'github': 'https://github.com/gabriela-rocha',
        'linkedin': 'https://linkedin.com/in/gabriela-rocha',
    },
    {
        'email': 'henrique.alves@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Henrique Alves',
        'course': 'Engenharia de Software',
        'semester': 2,
        'bio': 'Iniciante em programação, focado em backend.',
        'github': None,
        'linkedin': None,
    },
    {
        'email': 'isabela.nunes@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Isabela Nunes',
        'course': 'Sistemas de Informação',
        'semester': 6,
        'bio': 'Analista de dados e entusiasta de BI.',
        'github': 'https://github.com/isabela-nunes',
        'linkedin': 'https://linkedin.com/in/isabela-nunes',
    },
    {
        'email': 'joao.pires@liga.dev',
        'password': 'liga@2026',
        'full_name': 'João Pires',
        'course': 'Ciência da Computação',
        'semester': 4,
        'bio': '',
        'github': 'https://github.com/joao-pires',
        'linkedin': None,
    },
    # Sem equipe
    {
        'email': 'karen.souza@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Karen Souza',
        'course': 'Engenharia de Software',
        'semester': 1,
        'bio': 'Caloura animada, buscando minha primeira equipe!',
        'github': None,
        'linkedin': None,
    },
    {
        'email': 'lucas.teixeira@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Lucas Teixeira',
        'course': 'Ciência da Computação',
        'semester': 3,
        'bio': 'Gosto de algoritmos e competições de programação.',
        'github': 'https://github.com/lucas-teixeira',
        'linkedin': 'https://linkedin.com/in/lucas-teixeira',
    },
    {
        'email': 'mariana.gomes@liga.dev',
        'password': 'liga@2026',
        'full_name': 'Mariana Gomes',
        'course': 'Sistemas de Informação',
        'semester': 5,
        'bio': 'Desenvolvedora mobile com foco em React Native.',
        'github': 'https://github.com/mariana-gomes',
        'linkedin': 'https://linkedin.com/in/mariana-gomes',
    },
]

TEAMS = [
    {
        'name': 'Bit Blazers',
        'status': Team.STATUS_APPROVED,
        'is_open': False,
        'leader_email': 'ana.oliveira@liga.dev',
        'member_emails': [
            'ana.oliveira@liga.dev',
            'bruno.santos@liga.dev',
            'carla.melo@liga.dev',
            'diego.costa@liga.dev',
        ],
    },
    {
        'name': 'Lambda Squad',
        'status': Team.STATUS_SUBMITTED,
        'is_open': False,
        'leader_email': 'elena.ferreira@liga.dev',
        'member_emails': [
            'elena.ferreira@liga.dev',
            'fabio.lima@liga.dev',
            'gabriela.rocha@liga.dev',
            'henrique.alves@liga.dev',
        ],
    },
    {
        'name': 'Stack Overflow',
        'status': Team.STATUS_FORMING,
        'is_open': True,
        'leader_email': 'isabela.nunes@liga.dev',
        'member_emails': [
            'isabela.nunes@liga.dev',
            'joao.pires@liga.dev',
        ],
    },
]


class Command(BaseCommand):
    help = 'Cria participantes e equipes de demonstração para testes.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Remove dados de demo anteriores antes de criar novos.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            emails = [p['email'] for p in PARTICIPANTS]
            deleted, _ = User.objects.filter(email__in=emails).delete()
            self.stdout.write(f'Removidos {deleted} usuários de demo anteriores.')

        participants: dict[str, Participant] = {}
        created_p = 0

        for data in PARTICIPANTS:
            user, user_created = User.objects.get_or_create(
                email=data['email'],
                defaults={'username': data['email']},
            )
            if user_created:
                user.set_password(data['password'])
                user.save()

            participant, p_created = Participant.objects.get_or_create(
                user=user,
                defaults={
                    'full_name': data['full_name'],
                    'course': data['course'],
                    'semester': data['semester'],
                    'bio': data['bio'],
                    'github': data['github'],
                    'linkedin': data['linkedin'],
                },
            )
            participants[data['email']] = participant
            if p_created:
                created_p += 1

        created_t = 0
        for tdata in TEAMS:
            leader = participants[tdata['leader_email']]
            team, t_created = Team.objects.get_or_create(
                name=tdata['name'],
                defaults={
                    'leader': leader,
                    'status': tdata['status'],
                    'is_open': tdata['is_open'],
                },
            )
            if t_created:
                for email in tdata['member_emails']:
                    member = participants[email]
                    TeamMembership.objects.get_or_create(team=team, participant=member)
                created_t += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Criados {created_p} participante(s) e {created_t} equipe(s) de demo.'
            )
        )
        self.stdout.write('')
        self.stdout.write('Credenciais de acesso:')
        for p in PARTICIPANTS:
            self.stdout.write(f'  {p["email"]}  /  {p["password"]}')
