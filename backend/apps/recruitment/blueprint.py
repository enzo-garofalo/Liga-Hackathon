"""Desenho do processo seletivo da Liga: etapas, pesos e barema.

Fonte única usada por dois lugares que precisam do mesmo desenho:

- `ensure_selection_process` — cria o processo real, como rascunho, no deploy.
- `seed_recruitment_demo` — cria o processo de demonstração com candidatos falsos.

Manter os dois lendo daqui evita o barema envelhecer em um e não no outro. Os
pesos vêm do planejamento do processo seletivo e somam 100% em cada nível: as
etapas avaliadas entre si, e os critérios dentro de cada etapa.
"""

PROCESS_NAME = 'Processo Seletivo Liga de TI 2026.2'

PROCESS_DESCRIPTION = (
    'Venha fazer parte da Liga de TI e desenvolva projetos reais, '
    'participe de eventos, conheça empresas parceiras e faça parte '
    'da comunidade.\n\n'
    'Buscamos pessoas comprometidas, curiosas e com vontade de '
    'aprender. O mais importante é seu comprometimento ao longo '
    'do processo.'
)

# `duration_days` é quanto a etapa dura, contado a partir do fim da anterior.
# Serve de ponto de partida ao criar o processo: as datas reais são ajustadas
# depois em "Editar processo" ou na configuração de cada etapa.
STAGES = [
    {
        'name': 'Inscrição',
        'description': 'Preenchimento do formulário de inscrição.',
        'duration_days': 14,
        'weight': 0,
        'criteria': [],
        'allows_file_upload': False,
    },
    {
        'name': 'Resolução do Case',
        'description': 'Entrega de um case prático em até 7 dias.',
        'duration_days': 7,
        'weight': 35,
        'criteria': [
            ('Compreensão do problema', 15),
            ('Pensamento crítico', 20),
            ('Qualidade da solução', 15),
            ('Viabilidade', 15),
            ('Justificativa das decisões', 15),
            ('Estrutura e clareza', 10),
            ('Criatividade e iniciativa', 10),
        ],
        'allows_file_upload': True,
        'max_files': 1,
        'allowed_file_types': ['pdf'],
    },
    {
        'name': 'Pitch',
        'description': 'Apresentação da solução em 5 minutos, com 3 de perguntas.',
        'duration_days': 2,
        'weight': 30,
        'criteria': [
            ('Clareza da comunicação', 20),
            ('Capacidade de síntese', 15),
            ('Argumentação', 20),
            ('Domínio da solução', 20),
            ('Resposta às perguntas', 15),
            ('Organização da apresentação', 10),
        ],
        'allows_file_upload': False,
    },
    {
        'name': 'Entrevista',
        'description': 'Entrevista individual estruturada com a comissão.',
        'duration_days': 3,
        'weight': 35,
        'criteria': [
            ('Motivação', 20),
            ('Comprometimento', 25),
            ('Trabalho em equipe', 20),
            ('Iniciativa', 15),
            ('Capacidade de aprendizado', 10),
            ('Alinhamento com o propósito da Liga', 10),
        ],
        'allows_file_upload': False,
    },
]


def stage_by_name(name):
    for stage in STAGES:
        if stage['name'] == name:
            return stage
    raise KeyError(f'Etapa fora do blueprint: {name}')
