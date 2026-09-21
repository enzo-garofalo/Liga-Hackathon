from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.conf import settings

from .models import (
    HackathonInfo,
    InviteStatus,
    JoinRequest,
    Notification,
    Participant,
    Team,
    TeamInvite,
    TeamMembership,
)
from .services import password_reset
from .services.teams import assert_deadline_not_passed

User = get_user_model()


# Teto da bio, o mesmo que os dois formulários prometem na tela.
#
# Vive aqui e não no modelo porque `apps.teams` está em produção com o
# hackathon e a fronteira entre os domínios proíbe mexer na estrutura desses
# modelos. O contrato da API é o serializer, e é o que o cliente encontra.
BIO_MAX_LENGTH = 1500


class ParticipantPublicSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    has_team = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = [
            'id',
            'email',
            'full_name',
            'phone',
            'course',
            'semester',
            'bio',
            'github',
            'linkedin',
            'has_team',
            'team_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_has_team(self, obj):
        return obj.has_team

    def get_team_name(self, obj):
        membership = (
            TeamMembership.objects.filter(participant=obj)
            .select_related('team')
            .first()
        )
        return membership.team.name if membership else None


class MeSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    has_team = serializers.BooleanField(read_only=True)
    team = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = [
            'id',
            'email',
            'full_name',
            'phone',
            'course',
            'semester',
            'bio',
            'github',
            'linkedin',
            'has_team',
            'team',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'email', 'has_team', 'team', 'created_at', 'updated_at']
        # O modelo é TextField sem teto: sem isto, a API aceitava bio de
        # qualquer tamanho enquanto a tela prometia 500.
        extra_kwargs = {'bio': {'max_length': BIO_MAX_LENGTH}}

    def get_team(self, obj):
        membership = (
            TeamMembership.objects.filter(participant=obj)
            .select_related('team')
            .first()
        )
        if not membership:
            return None
        return TeamMinimalSerializer(membership.team).data


class ParticipantListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'full_name', 'course', 'semester', 'bio', 'github', 'linkedin']
        read_only_fields = fields


class TeamSerializer(serializers.ModelSerializer):
    leader = ParticipantListSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id',
            'name',
            'leader',
            'members',
            'member_count',
            'is_open',
            'status',
            'submitted_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_members(self, obj):
        memberships = obj.memberships.select_related('participant').order_by('joined_at')
        return ParticipantListSerializer(
            [m.participant for m in memberships], many=True
        ).data

    def get_member_count(self, obj):
        return obj.memberships.count()


class TeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'is_open']

    def validate(self, attrs):
        creator = self.context['request'].user.participant
        if creator.has_team:
            raise serializers.ValidationError(
                'Você já está em uma equipe.'
            )
        assert_deadline_not_passed()
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        creator = self.context['request'].user.participant
        try:
            team = Team.objects.create(leader=creator, **validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {'name': 'Já existe uma equipe com este nome.'}
            )
        TeamMembership.objects.create(team=team, participant=creator)
        return team


class TeamUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'is_open']
        extra_kwargs = {
            'name': {'required': False},
            'is_open': {'required': False},
        }

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {'name': 'Já existe uma equipe com este nome.'}
            )


class TeamMinimalSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'is_open', 'status', 'member_count']
        read_only_fields = fields

    def get_member_count(self, obj):
        return obj.memberships.count()


class TeamInviteSerializer(serializers.ModelSerializer):
    team = TeamMinimalSerializer(read_only=True)
    invitee = ParticipantListSerializer(read_only=True)
    invited_by = ParticipantListSerializer(read_only=True)

    class Meta:
        model = TeamInvite
        fields = ['id', 'team', 'invitee', 'invited_by', 'status', 'created_at']
        read_only_fields = fields


class TeamInviteCreateSerializer(serializers.Serializer):
    invitee_id = serializers.UUIDField(write_only=True)

    def validate(self, attrs):
        team = self.context['team']

        if team.status != Team.STATUS_FORMING:
            raise serializers.ValidationError(
                'A equipe não aceita mais convites.'
            )
        if team.memberships.count() >= 4:
            raise serializers.ValidationError('A equipe já tem 4 membros.')

        try:
            invitee = Participant.objects.get(pk=attrs['invitee_id'])
        except Participant.DoesNotExist:
            raise serializers.ValidationError(
                {'invitee_id': 'Participante não encontrado.'}
            )
        if invitee.has_team:
            raise serializers.ValidationError(
                {'invitee_id': 'Este participante já está em uma equipe.'}
            )
        if TeamInvite.objects.filter(
            team=team, invitee=invitee, status=InviteStatus.PENDING
        ).exists():
            raise serializers.ValidationError(
                {'invitee_id': 'Já existe um convite pendente para este participante.'}
            )

        attrs['invitee'] = invitee
        return attrs

    def create(self, validated_data):
        team = self.context['team']
        invited_by = self.context['invited_by']
        return TeamInvite.objects.create(
            team=team,
            invitee=validated_data['invitee'],
            invited_by=invited_by,
            status=InviteStatus.PENDING,
        )


class JoinRequestSerializer(serializers.ModelSerializer):
    team = TeamMinimalSerializer(read_only=True)
    requester = ParticipantListSerializer(read_only=True)

    class Meta:
        model = JoinRequest
        fields = ['id', 'team', 'requester', 'status', 'created_at']
        read_only_fields = fields


class JoinRequestCreateSerializer(serializers.Serializer):
    def validate(self, attrs):
        team = self.context['team']
        requester = self.context['requester']

        if requester.has_team:
            raise serializers.ValidationError('Você já está em uma equipe.')
        if team.status != Team.STATUS_FORMING:
            raise serializers.ValidationError(
                'A equipe não aceita mais pedidos.'
            )
        if not team.is_open:
            raise serializers.ValidationError(
                'A equipe não está aberta para pedidos.'
            )
        if team.memberships.count() >= 4:
            raise serializers.ValidationError('A equipe já tem 4 membros.')
        if JoinRequest.objects.filter(
            team=team, requester=requester, status=InviteStatus.PENDING
        ).exists():
            raise serializers.ValidationError(
                'Você já enviou um pedido pendente para esta equipe.'
            )
        return attrs

    def create(self, validated_data):
        return JoinRequest.objects.create(
            team=self.context['team'],
            requester=self.context['requester'],
            status=InviteStatus.PENDING,
        )


class NotificationSerializer(serializers.ModelSerializer):
    # Rótulo humano do tipo, para o detalhe da notificação não repetir no frontend
    # a lista de tipos. Sai de NotificationType.CHOICES, que já é a fonte.
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'type_display',
            'message',
            'read',
            'link_to',
            'created_at',
        ]
        read_only_fields = fields


class HackathonInfoSerializer(serializers.ModelSerializer):
    team_deadline = serializers.SerializerMethodField()

    class Meta:
        model = HackathonInfo
        fields = ['content', 'team_deadline', 'updated_at']
        read_only_fields = fields

    def get_team_deadline(self, obj):
        return settings.TEAM_DEADLINE.isoformat()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    course = serializers.CharField(max_length=255)
    semester = serializers.IntegerField(min_value=1, max_value=20)
    bio = serializers.CharField(max_length=BIO_MAX_LENGTH)
    github = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    linkedin = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Já existe uma conta com este e-mail.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        try:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
            )
        except IntegrityError:
            raise serializers.ValidationError(
                {'email': 'Já existe uma conta com este e-mail.'}
            )
        return Participant.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone') or None,
            course=validated_data['course'],
            semester=validated_data['semester'],
            bio=validated_data['bio'],
            github=validated_data.get('github') or None,
            linkedin=validated_data.get('linkedin') or None,
        )


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)
        self.fields['email'] = serializers.EmailField()

    def validate(self, attrs):
        User = get_user_model()
        email = attrs.pop('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed('Usuário e/ou senha incorreto(s).')
        attrs[self.username_field] = user.username
        return super().validate(attrs)


class ParticipantTokenObtainPairSerializer(EmailTokenObtainPairSerializer):
    """Login da área do candidato: exige cadastro de participante.

    Sem esta checagem, um organizador entrava por `/login` com sucesso e caía
    num painel quebrado: `/me/` e `/me/applications/` respondem 404 e as
    notificações 403, porque a conta dele não tem `Participant`. O erro
    aparecia depois do login, em três telas diferentes, sem dizer o que fazer.

    A checagem é por perfil, não por `is_staff`: quem for organizador e também
    tiver se candidatado continua entrando pelas duas portas.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        if not hasattr(self.user, 'participant'):
            raise AuthenticationFailed(
                'Esta conta não tem cadastro de candidato. '
                'Se você é da organização, entre pela área do organizador.'
            )
        return data


class AdminTokenObtainPairSerializer(EmailTokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise AuthenticationFailed('Acesso restrito a administradores.')
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    """Pedido do link. Só o endereço, e a resposta é sempre a mesma.

    Nada de validar se a conta existe: a mensagem de erro diria a qualquer um,
    sem login, quem tem conta na Liga.
    """

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """O link em uso: identidade vem do token, não de quem está chamando.

    `min_length` repete o cadastro; `validate_password` aplica as mesmas regras
    do Django que valem na criação da conta, para a redefinição não virar a
    porta dos fundos para uma senha fraca.
    """

    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate(self, attrs):
        user = password_reset.conta_do_link(attrs['uid'], attrs['token'])
        validate_password(attrs['password'], user=user)
        attrs['user'] = user
        return attrs
