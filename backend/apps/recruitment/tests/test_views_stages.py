import pytest

from apps.recruitment.models import EvaluationCriterion, ProcessStatus, Stage

from .factories import (
    ApplicationFactory,
    EvaluationCriterionFactory,
    EvaluationFactory,
    StageFactory,
)

pytestmark = pytest.mark.django_db


def stages_url(process_id):
    return f'/api/v1/admin/processes/{process_id}/stages/'


def stage_url(stage_id):
    return f'/api/v1/admin/stages/{stage_id}/'


def reorder_url(process_id):
    return f'/api/v1/admin/processes/{process_id}/stages/reorder/'


def test_create_stage_assigns_next_order(admin_client, process):
    StageFactory(process=process, order=1)
    r = admin_client.post(stages_url(process.id), {'name': 'Pitch'}, format='json')
    assert r.status_code == 201
    assert r.data['order'] == 2


def test_create_first_stage_gets_order_one(admin_client, process):
    r = admin_client.post(stages_url(process.id), {'name': 'Inscrição'}, format='json')
    assert r.status_code == 201
    assert r.data['order'] == 1


def test_create_stage_with_nested_criteria(admin_client, process):
    r = admin_client.post(
        stages_url(process.id),
        {
            'name': 'Case',
            'allows_file_upload': True,
            'max_files': 3,
            'allowed_file_types': ['pdf', 'zip'],
            'criteria': [
                {'name': 'Pensamento crítico', 'order': 1},
                {'name': 'Criatividade', 'order': 2},
            ],
        },
        format='json',
    )
    assert r.status_code == 201
    stage = Stage.objects.get(id=r.data['id'])
    assert stage.allowed_file_types == ['pdf', 'zip']
    assert list(stage.criteria.values_list('name', flat=True)) == [
        'Pensamento crítico',
        'Criatividade',
    ]


def test_create_stage_fails_when_end_before_start(admin_client, process):
    from datetime import timedelta

    from django.utils import timezone

    start = timezone.now()
    r = admin_client.post(
        stages_url(process.id),
        {
            'name': 'Case',
            'start_at': start.isoformat(),
            'end_at': (start - timedelta(hours=1)).isoformat(),
        },
        format='json',
    )
    assert r.status_code == 400


def test_patch_stage_can_rename_criterion(admin_client, process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage, name='Antigo')
    EvaluationFactory(
        application=ApplicationFactory(process=process),
        stage=stage,
        criterion=criterion,
        score=8,
    )

    r = admin_client.patch(
        stage_url(stage.id),
        {'criteria': [{'id': str(criterion.id), 'name': 'Novo', 'order': 1}]},
        format='json',
    )
    assert r.status_code == 200
    criterion.refresh_from_db()
    assert criterion.name == 'Novo'


def test_patch_stage_cannot_remove_criterion_with_evaluations(admin_client, process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage)
    EvaluationFactory(
        application=ApplicationFactory(process=process),
        stage=stage,
        criterion=criterion,
        score=8,
    )

    r = admin_client.patch(
        stage_url(stage.id),
        {'criteria': [{'name': 'Outro critério', 'order': 1}]},
        format='json',
    )
    assert r.status_code == 400
    assert EvaluationCriterion.objects.filter(id=criterion.id).exists()


def test_patch_stage_can_remove_criterion_without_evaluations(admin_client, process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage)

    r = admin_client.patch(
        stage_url(stage.id),
        {'criteria': [{'name': 'Substituto', 'order': 1}]},
        format='json',
    )
    assert r.status_code == 200
    assert not EvaluationCriterion.objects.filter(id=criterion.id).exists()


def test_delete_stage_fails_with_applications_in_it(admin_client, process):
    stage = StageFactory(process=process, order=1)
    ApplicationFactory(process=process, current_stage=stage)

    r = admin_client.delete(stage_url(stage.id))
    assert r.status_code == 400
    assert Stage.objects.filter(id=stage.id).exists()


def test_delete_stage_fails_with_evaluations(admin_client, process):
    stage = StageFactory(process=process, order=1)
    criterion = EvaluationCriterionFactory(stage=stage)
    EvaluationFactory(
        application=ApplicationFactory(process=process),
        stage=stage,
        criterion=criterion,
        score=7,
    )

    assert admin_client.delete(stage_url(stage.id)).status_code == 400


def test_delete_empty_stage_succeeds(admin_client, process):
    stage = StageFactory(process=process, order=1)
    assert admin_client.delete(stage_url(stage.id)).status_code == 204


# ── Publicado não perde etapa ─────────────────────────────────────
#
# O candidato lê as etapas antes de se inscrever, e o e-mail de confirmação
# lista todas. Sumir com uma depois muda o combinado depois do aceite. Editar
# continua valendo: é acertar o que foi combinado, não trocar por outro.


def test_published_process_does_not_lose_stages(admin_client, process):
    stage = StageFactory(process=process, order=1)
    process.status = ProcessStatus.PUBLISHED
    process.save(update_fields=['status'])

    r = admin_client.delete(stage_url(stage.id))

    assert r.status_code == 400
    assert 'não excluídas' in str(r.data)
    assert Stage.objects.filter(id=stage.id).exists()


def test_empty_stage_of_published_process_is_also_kept(admin_client, process):
    """Etapa vazia também fica: alguém ainda vai chegar nela."""
    stage = StageFactory(process=process, order=1)
    process.status = ProcessStatus.PUBLISHED
    process.save(update_fields=['status'])
    assert not stage.current_applications.exists()

    assert admin_client.delete(stage_url(stage.id)).status_code == 400


def test_published_process_still_allows_editing_the_stage(admin_client, process):
    stage = StageFactory(process=process, order=1, name='Case')
    process.status = ProcessStatus.PUBLISHED
    process.save(update_fields=['status'])

    r = admin_client.patch(
        stage_url(stage.id), {'name': 'Resolução do Case'}, format='json'
    )

    assert r.status_code == 200
    stage.refresh_from_db()
    assert stage.name == 'Resolução do Case'


def test_closed_process_does_not_lose_stages_either(admin_client, process):
    # Encerrado já é barrado antes, por assert_process_editable. O teste fica
    # como garantia do resultado, não da regra que o produz.
    stage = StageFactory(process=process, order=1)
    process.status = ProcessStatus.CLOSED
    process.save(update_fields=['status'])

    assert admin_client.delete(stage_url(stage.id)).status_code == 400
    assert Stage.objects.filter(id=stage.id).exists()


def test_reorder_stages(admin_client, process):
    first = StageFactory(process=process, order=1)
    second = StageFactory(process=process, order=2)
    third = StageFactory(process=process, order=3)

    r = admin_client.patch(
        reorder_url(process.id),
        {'order': [str(third.id), str(first.id), str(second.id)]},
        format='json',
    )
    assert r.status_code == 200
    assert [s.id for s in process.stages.order_by('order')] == [
        third.id,
        first.id,
        second.id,
    ]


def test_reorder_fails_with_applications_in_progress(admin_client, process):
    first = StageFactory(process=process, order=1)
    second = StageFactory(process=process, order=2)
    ApplicationFactory(process=process, current_stage=first)

    r = admin_client.patch(
        reorder_url(process.id),
        {'order': [str(second.id), str(first.id)]},
        format='json',
    )
    assert r.status_code == 400


def test_reorder_fails_with_incomplete_list(admin_client, process):
    first = StageFactory(process=process, order=1)
    StageFactory(process=process, order=2)

    r = admin_client.patch(
        reorder_url(process.id), {'order': [str(first.id)]}, format='json'
    )
    assert r.status_code == 400


def test_stage_changes_blocked_on_closed_process(admin_client, process):
    stage = StageFactory(process=process, order=1)
    process.status = ProcessStatus.CLOSED
    process.save()

    r = admin_client.patch(stage_url(stage.id), {'name': 'Nova'}, format='json')
    assert r.status_code == 400


def test_candidate_cannot_manage_stages(candidate_client, process):
    assert candidate_client.get(stages_url(process.id)).status_code == 403
