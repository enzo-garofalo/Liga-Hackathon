import pytest
from django.core import mail

from apps.recruitment.models import (
    ApplicationStatus,
    Communication,
    CommunicationType,
    ProcessStatus,
)
from apps.teams.models import Notification, NotificationType
from apps.teams.tests.factories import ParticipantFactory

from .factories import ApplicationFactory, StageFactory

pytestmark = pytest.mark.django_db


def url(process_id, query=''):
    return f'/api/v1/admin/processes/{process_id}/communications/{query}'


@pytest.fixture
def scenario(process):
    first = StageFactory(process=process, order=1, name='Case')
    last = StageFactory(process=process, order=2, name='Entrevista')
    process.status = ProcessStatus.PUBLISHED
    process.save()

    return {
        'first': first,
        'last': last,
        'ana': ApplicationFactory(
            process=process,
            participant=ParticipantFactory(full_name='Ana'),
            current_stage=first,
        ),
        'bruno': ApplicationFactory(
            process=process,
            participant=ParticipantFactory(full_name='Bruno'),
            current_stage=last,
            status=ApplicationStatus.APPROVED,
        ),
        'joao': ApplicationFactory(
            process=process,
            participant=ParticipantFactory(full_name='João'),
            current_stage=first,
            status=ApplicationStatus.REJECTED,
        ),
    }


def payload(**overrides):
    data = {
        'audience': 'all',
        'subject': 'Aviso importante',
        'message': 'Olá {nome}, leia com atenção.',
    }
    data.update(overrides)
    return data


def test_send_to_all_resolves_every_applicant(admin_client, process, scenario):
    mail.outbox.clear()
    r = admin_client.post(url(process.id), payload(), format='json')
    assert r.status_code == 201
    assert r.data['recipient_count'] == 3
    assert len(mail.outbox) == 3


def test_send_to_stage_resolves_only_that_stage(admin_client, process, scenario):
    r = admin_client.post(
        url(process.id),
        payload(audience='stage', audience_stage=str(scenario['last'].id)),
        format='json',
    )
    assert r.status_code == 201
    assert [p['full_name'] for p in r.data['recipients']] == ['Bruno']


def test_send_to_approved_resolves_only_approved(admin_client, process, scenario):
    r = admin_client.post(url(process.id), payload(audience='approved'), format='json')
    assert [p['full_name'] for p in r.data['recipients']] == ['Bruno']


def test_send_to_rejected_resolves_only_rejected(admin_client, process, scenario):
    r = admin_client.post(url(process.id), payload(audience='rejected'), format='json')
    assert [p['full_name'] for p in r.data['recipients']] == ['João']


def test_send_to_specific_resolves_listed_participants(admin_client, process, scenario):
    r = admin_client.post(
        url(process.id),
        payload(
            audience='specific',
            recipients=[str(scenario['ana'].participant.id)],
        ),
        format='json',
    )
    assert [p['full_name'] for p in r.data['recipients']] == ['Ana']


def test_stage_audience_requires_stage_id(admin_client, process, scenario):
    r = admin_client.post(url(process.id), payload(audience='stage'), format='json')
    assert r.status_code == 400


def test_specific_audience_requires_recipients(admin_client, process, scenario):
    r = admin_client.post(url(process.id), payload(audience='specific'), format='json')
    assert r.status_code == 400


def test_message_placeholder_replaced_with_candidate_name(
    admin_client, process, scenario
):
    mail.outbox.clear()
    admin_client.post(
        url(process.id),
        payload(audience='approved', message='Olá {nome}, parabéns!'),
        format='json',
    )
    assert 'Olá Bruno, parabéns!' in mail.outbox[0].body


def test_communication_creates_notification_per_recipient(
    admin_client, process, scenario
):
    admin_client.post(url(process.id), payload(), format='json')
    notifications = Notification.objects.filter(
        type=NotificationType.CUSTOM_COMMUNICATION
    )
    assert notifications.count() == 3


def test_communication_appears_in_history(admin_client, process, scenario):
    admin_client.post(url(process.id), payload(), format='json')

    r = admin_client.get(url(process.id))
    assert r.status_code == 200
    manual = [row for row in r.data if row['type'] == CommunicationType.MANUAL]
    assert len(manual) == 1
    assert manual[0]['subject'] == 'Aviso importante'
    assert manual[0]['recipient_count'] == 3


def test_history_filters_by_type(admin_client, process, scenario):
    admin_client.post(url(process.id), payload(), format='json')
    r = admin_client.get(url(process.id, '?type=manual'))
    assert all(row['type'] == 'manual' for row in r.data)


def test_auto_communication_is_recorded_on_bulk_action(admin_client, process, scenario):
    bulk_url = f'/api/v1/admin/processes/{process.id}/applications/bulk-action/'
    admin_client.post(
        bulk_url,
        {
            'applications': [str(scenario['ana'].id)],
            'action': 'move_stage',
            'target_stage': str(scenario['last'].id),
        },
        format='json',
    )

    auto = Communication.objects.filter(type=CommunicationType.AUTO)
    assert auto.count() == 1
    assert auto.first().subject == 'Convocação para Entrevista'
    assert auto.first().recipients.count() == 1
    # O histórico precisa repetir o que foi dito, não "comunicação automática".
    assert 'avançou para a etapa Entrevista' in auto.first().message


def test_auto_communication_records_what_the_candidate_was_told(
    admin_client, process, scenario
):
    bulk_url = f'/api/v1/admin/processes/{process.id}/applications/bulk-action/'
    admin_client.post(
        bulk_url,
        {'applications': [str(scenario['ana'].id)], 'action': 'reject'},
        format='json',
    )

    auto = Communication.objects.get(type=CommunicationType.AUTO)
    assert auto.subject == 'Resultado: não aprovados'
    assert 'não seguiu adiante' in auto.message


def test_discard_does_not_record_communication(admin_client, process, scenario):
    bulk_url = f'/api/v1/admin/processes/{process.id}/applications/bulk-action/'
    admin_client.post(
        bulk_url,
        {'applications': [str(scenario['ana'].id)], 'action': 'discard'},
        format='json',
    )
    assert not Communication.objects.filter(type=CommunicationType.AUTO).exists()


def test_application_confirmations_are_aggregated(candidate_client, process):
    """Inscrições viram uma linha só no histórico, com o total de candidatos.

    Uma linha por inscrição deixaria a aba de Comunicações ilegível num
    processo com 150 candidatos.
    """
    StageFactory(process=process, order=1)
    process.status = ProcessStatus.PUBLISHED
    process.save()

    candidate_client.post(f'/api/v1/processes/{process.id}/apply/')

    from apps.teams.tests.factories import ParticipantFactory
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    other = ParticipantFactory()
    other_client = APIClient()
    other_client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other.user).access_token}'
    )
    other_client.post(f'/api/v1/processes/{process.id}/apply/')

    auto = Communication.objects.filter(
        type=CommunicationType.AUTO, subject='Inscrição confirmada'
    )
    assert auto.count() == 1
    assert auto.first().recipients.count() == 2


def test_detail_returns_message_and_recipients(admin_client, process, scenario):
    created = admin_client.post(url(process.id), payload(), format='json')

    r = admin_client.get(f'/api/v1/admin/communications/{created.data["id"]}/')
    assert r.status_code == 200
    assert r.data['message'] == 'Olá {nome}, leia com atenção.'
    assert len(r.data['recipients']) == 3


def test_cannot_send_on_draft_process(admin_client, process):
    ApplicationFactory(process=process)
    r = admin_client.post(url(process.id), payload(), format='json')
    assert r.status_code == 400


def test_send_fails_when_no_recipients_match(admin_client, process, scenario):
    scenario['bruno'].status = ApplicationStatus.IN_PROGRESS
    scenario['bruno'].save()

    r = admin_client.post(url(process.id), payload(audience='approved'), format='json')
    assert r.status_code == 400


def test_candidate_cannot_access_communications(candidate_client, process):
    assert candidate_client.get(url(process.id)).status_code == 403
    assert candidate_client.post(url(process.id), payload(), format='json').status_code == 403
