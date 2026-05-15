import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

from apps.teams.models import (
    InviteStatus,
    JoinRequest,
    Participant,
    Team,
    TeamInvite,
    TeamMembership,
)

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username',)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'user{n}@x.com')
    email = factory.LazyAttribute(lambda obj: obj.username)
    password = factory.PostGenerationMethodCall('set_password', 'strongpass123')


class ParticipantFactory(DjangoModelFactory):
    class Meta:
        model = Participant

    user = factory.SubFactory(UserFactory)
    full_name = factory.Sequence(lambda n: f'Participant {n}')
    course = 'Ciência da Computação'
    semester = 4
    bio = 'Bio padrão para testes.'


class TeamFactory(DjangoModelFactory):
    class Meta:
        model = Team
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f'Team {n}')
    leader = factory.SubFactory(ParticipantFactory)
    is_open = False

    @factory.post_generation
    def add_leader_membership(obj, create, extracted, **kwargs):
        if not create:
            return
        TeamMembership.objects.get_or_create(team=obj, participant=obj.leader)


class TeamMembershipFactory(DjangoModelFactory):
    class Meta:
        model = TeamMembership

    team = factory.SubFactory(TeamFactory)
    participant = factory.SubFactory(ParticipantFactory)


class TeamInviteFactory(DjangoModelFactory):
    class Meta:
        model = TeamInvite

    team = factory.SubFactory(TeamFactory)
    invitee = factory.SubFactory(ParticipantFactory)
    invited_by = factory.LazyAttribute(lambda obj: obj.team.leader)
    status = InviteStatus.PENDING


class JoinRequestFactory(DjangoModelFactory):
    class Meta:
        model = JoinRequest

    team = factory.SubFactory(TeamFactory)
    requester = factory.SubFactory(ParticipantFactory)
    status = InviteStatus.PENDING
