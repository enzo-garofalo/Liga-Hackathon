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
        # Quem lê isto já se inscreveu: a descrição diz o que acontece agora,
        # não o que a pessoa acabou de fazer.
        'description': (
            'Inscrição confirmada. O case é divulgado no início da próxima etapa, '
            'e você recebe um aviso por e-mail.'
        ),
        'instructions': (
            'Sua inscrição está confirmada. Não há nada a entregar nesta etapa.\n'
            '\n'
            'Enquanto o case não é divulgado:\n'
            '1. Confira se seus dados estão certos no seu perfil\n'
            '2. Fique de olho no e-mail que você cadastrou, inclusive no spam\n'
            '3. Entre no canal oficial de comunicação, se a Liga enviar o convite\n'
            '\n'
            'Quando a próxima etapa abrir, você recebe um aviso e o enunciado aparece aqui.\n'
        ),
        'duration_days': 14,
        'weight': 0,
        'criteria': [],
        'allows_file_upload': False,
    },
    {
        'name': 'Resolução do Case',
        'description': 'Entrega de um case prático em até 7 dias.',
        'instructions': (
            'SUBSTITUA ESTE PARÁGRAFO PELO ENUNCIADO DESTA EDIÇÃO. O tema muda a cada processo seletivo; o resto deste texto vale para qualquer um.\n'
            '\n'
            'Sua proposta deve explicar:\n'
            '1. Qual problema ou oportunidade você identificou\n'
            '2. Qual público pretende atingir\n'
            '3. Qual é a solução proposta\n'
            '4. Por que você acredita que ela faria sentido\n'
            '5. Como a Liga poderia executá-la\n'
            '6. Quais recursos seriam necessários\n'
            '7. Quais seriam as principais dificuldades\n'
            '8. Como medir o resultado da iniciativa\n'
            '\n'
            'Formato: PDF de no máximo 3 páginas, enviado por esta plataforma. Diagramas e protótipos são bem-vindos, mas não obrigatórios. Não é preciso escrever código.\n'
            '\n'
            'Você pode usar ferramentas de IA como apoio, para pesquisa, revisão e organização. Você continua responsável pelo que entregou e precisa conseguir defender cada escolha no pitch.\n'
            '\n'
            'Não existe resposta correta. O que avaliamos é como você chegou até ela.\n'
        ),
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
        'instructions': (
            'Você apresenta e defende a solução que entregou no case. Não é uma atividade nova: é a mesma proposta, agora falada.\n'
            '\n'
            '5 minutos de apresentação e 3 de perguntas da banca.\n'
            '\n'
            'Acontece presencialmente na PUC-Campinas. A sala e o horário chegam por e-mail. Leve o que precisar para apresentar; slides são opcionais.\n'
        ),
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
        'instructions': (
            'Conversa individual com a comissão, para conhecer você além das entregas.\n'
            '\n'
            'Todos respondem a um conjunto parecido de perguntas: por que quer entrar na Liga, o que espera aprender, quanto tempo consegue dedicar por semana, e situações em que você assumiu uma responsabilidade ou trabalhou com quem pensa diferente de você.\n'
            '\n'
            'Não precisa preparar apresentação. Vale mais responder com honestidade sobre sua disponibilidade real do que prometer o que não vai conseguir cumprir.\n'
        ),
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
