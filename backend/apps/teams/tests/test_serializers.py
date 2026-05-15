import pytest
from django.contrib.auth import get_user_model

from apps.teams.models import Participant
from apps.teams.serializers import RegisterSerializer

User = get_user_model()
pytestmark = pytest.mark.django_db


VALID_DATA = {
    'email': 'novo@x.com',
    'password': 'strongpass123',
    'full_name': 'Novo User',
    'course': 'CC',
    'semester': 3,
    'bio': 'Hello',
}


def test_register_creates_user_and_participant():
    s = RegisterSerializer(data=VALID_DATA)
    assert s.is_valid(), s.errors
    participant = s.save()
    assert isinstance(participant, Participant)
    assert User.objects.filter(username='novo@x.com').exists()
    assert participant.user.email == 'novo@x.com'
    assert participant.user.check_password('strongpass123')


def test_register_fails_duplicate_email():
    User.objects.create_user(username='novo@x.com', email='novo@x.com', password='x' * 12)
    s = RegisterSerializer(data=VALID_DATA)
    assert not s.is_valid()
    assert 'email' in s.errors


@pytest.mark.parametrize('field', ['full_name', 'course', 'semester', 'bio'])
def test_register_requires_full_name_course_semester_bio(field):
    data = {**VALID_DATA}
    data.pop(field)
    s = RegisterSerializer(data=data)
    assert not s.is_valid()
    assert field in s.errors


def test_github_and_linkedin_optional():
    data = {**VALID_DATA, 'github': '', 'linkedin': ''}
    s = RegisterSerializer(data=data)
    assert s.is_valid(), s.errors
    p = s.save()
    assert p.github is None
    assert p.linkedin is None
