"""Distribuição de avaliadores entre candidatos.

O planejamento da Liga prevê dois corretores independentes por case,
distribuídos entre candidatos diferentes, e um terceiro avaliador quando as
duas notas divergem além do limiar do processo.
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.recruitment.models import (
    Application,
    ApplicationStatus,
    ProcessStatus,
    StageAssignment,
)
from apps.recruitment.services.roles import can_open_process

User = get_user_model()


def _assert_stage_open(stage):
    if stage.process.status == ProcessStatus.CLOSED:
        raise ValidationError('Processo encerrado não aceita nova distribuição.')


def _assert_can_evaluate_here(evaluator, process):
    """Só recebe correção quem foi chamado para este processo.

    Sem isto, o coordenador distribuiria para qualquer conta de organizador da
    instalação, inclusive de outra edição, e essa pessoa passaria a enxergar
    candidatos de um processo do qual ninguém a chamou.
    """
    if not evaluator.is_staff:
        raise ValidationError(
            f'{evaluator.get_username()} não é organizador e não pode avaliar.'
        )
    if not can_open_process(evaluator, process):
        raise ValidationError(
            f'{evaluator.get_username()} não faz parte deste processo. '
            f'Adicione a pessoa ao processo antes de distribuir correções.'
        )


@transaction.atomic
def assign(stage, application, evaluators):
    """Designa avaliadores para uma candidatura numa etapa."""
    _assert_stage_open(stage)
    if application.process_id != stage.process_id:
        raise ValidationError('A candidatura não pertence ao processo desta etapa.')

    created = []
    for evaluator in evaluators:
        _assert_can_evaluate_here(evaluator, stage.process)
        assignment, _ = StageAssignment.objects.get_or_create(
            stage=stage, application=application, evaluator=evaluator
        )
        created.append(assignment)
    return created


@transaction.atomic
def unassign(stage, application, evaluator):
    StageAssignment.objects.filter(
        stage=stage, application=application, evaluator=evaluator
    ).delete()


@transaction.atomic
def auto_distribute(stage, evaluator_ids, per_application=2):
    """Distribui os candidatos da etapa entre os avaliadores, em rodízio.

    Cada candidatura recebe `per_application` avaliadores **distintos**, e a
    carga fica equilibrada entre os avaliadores. Redistribuir substitui a
    distribuição anterior da etapa, mas nunca apaga avaliação já registrada:
    as notas ficam no banco e voltam a valer se a pessoa for designada de novo.

    Entram só os candidatos que estão **nesta** etapa. Distribuir o case é
    repartir quem tem case para corrigir; quem já passou para o pitch não tem
    o que ser corrigido aqui, e quem ficou pelo caminho muito menos.
    """
    _assert_stage_open(stage)

    evaluators = list(User.objects.filter(id__in=evaluator_ids, is_staff=True))
    for evaluator in evaluators:
        _assert_can_evaluate_here(evaluator, stage.process)
    if len(evaluators) < per_application:
        raise ValidationError(
            f'São necessários ao menos {per_application} avaliadores para '
            f'distribuir {per_application} correções por candidato.'
        )

    applications = list(
        Application.objects.filter(
            process=stage.process,
            current_stage=stage,
            status=ApplicationStatus.IN_PROGRESS,
        ).order_by('created_at')
    )
    if not applications:
        raise ValidationError(
            'Não há candidatos nesta etapa para distribuir.'
        )

    StageAssignment.objects.filter(stage=stage).delete()

    total = len(evaluators)
    assignments = []
    for index, application in enumerate(applications):
        for slot in range(per_application):
            # O deslocamento por candidato evita que os mesmos dois
            # avaliadores fiquem sempre na mesma dupla.
            evaluator = evaluators[(index + slot) % total]
            assignments.append(
                StageAssignment(
                    stage=stage, application=application, evaluator=evaluator
                )
            )

    StageAssignment.objects.bulk_create(assignments)
    return assignments


def board(process):
    """Quem está em cada etapa e quem corrige cada um.

    É a tela de distribuição inteira em uma chamada. A pergunta que o
    coordenador faz é "quem está no case e quem vai corrigir", e não "qual
    etapa e quantos por candidato": escolher a etapa antes de ver alguém era
    distribuir no escuro.

    O coordenador enxerga o nome mesmo na etapa anônima, como em todo o resto:
    ele precisa saber quem está mandando para quem. O código vai junto, para
    ele conseguir cruzar com o que o avaliador vê.
    """
    designacoes = {}
    for row in StageAssignment.objects.filter(stage__process=process).values_list(
        'stage_id', 'application_id', 'evaluator_id'
    ):
        designacoes.setdefault((row[0], row[1]), []).append(row[2])

    candidaturas = (
        Application.objects.filter(process=process)
        .exclude(status=ApplicationStatus.WITHDRAWN)
        .select_related('participant')
        .order_by('participant__full_name')
    )
    por_etapa = {}
    for application in candidaturas:
        por_etapa.setdefault(application.current_stage_id, []).append(application)

    etapas = []
    for stage in process.stages.order_by('order'):
        etapas.append(
            {
                'id': str(stage.id),
                'name': stage.name,
                'order': stage.order,
                'anonymous_evaluation': stage.anonymous_evaluation,
                'candidates': [
                    {
                        'application': str(application.id),
                        'name': application.participant.full_name,
                        'code': application.code,
                        'status': application.status,
                        'evaluators': sorted(
                            designacoes.get((stage.id, application.id), [])
                        ),
                    }
                    for application in por_etapa.get(stage.id, [])
                ],
            }
        )
    return etapas


def workload_in_process(process):
    """Correções por avaliador no processo inteiro, indexado pelo id."""
    counts = {}
    for evaluator_id in StageAssignment.objects.filter(
        stage__process=process
    ).values_list('evaluator_id', flat=True):
        counts[evaluator_id] = counts.get(evaluator_id, 0) + 1
    return counts


@transaction.atomic
def set_evaluators(process, application, evaluators, stages):
    """Troca quem corrige esta candidatura, nas etapas escolhidas.

    Substitui, não acrescenta: o modal mostra quem está lá e o coordenador
    marca e desmarca até ficar como ele quer. Acrescentar deixaria sem jeito de
    tirar alguém.

    Serve para uma etapa ou para todas de uma vez, porque as duas perguntas
    aparecem: "quem corrige o case dele" e "quem acompanha essa pessoa no
    processo inteiro". Designar numa etapa em que o candidato ainda não chegou
    é adiantar trabalho, não erro.

    As notas já dadas ficam. Tirar alguém da distribuição não apaga o que ele
    avaliou, e devolver essa pessoa faz a nota dela voltar a valer.
    """
    if application.process_id != process.id:
        raise ValidationError('A candidatura não pertence a este processo.')
    if not stages:
        raise ValidationError('Escolha ao menos uma etapa.')

    for stage in stages:
        _assert_stage_open(stage)
        if stage.process_id != process.id:
            raise ValidationError('A etapa não pertence a este processo.')
    for evaluator in evaluators:
        _assert_can_evaluate_here(evaluator, process)

    StageAssignment.objects.filter(
        application=application, stage__in=stages
    ).delete()
    StageAssignment.objects.bulk_create(
        [
            StageAssignment(stage=stage, application=application, evaluator=evaluator)
            for stage in stages
            for evaluator in evaluators
        ]
    )


def workload(stage):
    """Quantas correções cada avaliador tem nesta etapa."""
    rows = StageAssignment.objects.filter(stage=stage).select_related('evaluator')
    counts = {}
    for row in rows:
        key = row.evaluator.get_username()
        counts[key] = counts.get(key, 0) + 1
    return counts
