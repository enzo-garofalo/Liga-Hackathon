from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Participant, Team, TeamMembership
from .services.teams import assert_deadline_not_passed

User = get_user_model()


class ParticipantPublicSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id',
            'email',
            'full_name',
            'course',
            'semester',
            'bio',
            'github',
            'linkedin',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class MeSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    has_team = serializers.BooleanField(read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id',
            'email',
            'full_name',
            'course',
            'semester',
            'bio',
            'github',
            'linkedin',
            'has_team',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'email', 'has_team', 'created_at', 'updated_at']


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


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    full_name = serializers.CharField(max_length=255)
    course = serializers.CharField(max_length=255)
    semester = serializers.IntegerField(min_value=1, max_value=20)
    bio = serializers.CharField()
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
        attrs[self.username_field] = attrs.pop('email')
        return super().validate(attrs)


class AdminTokenObtainPairSerializer(EmailTokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise AuthenticationFailed('Acesso restrito a administradores.')
        return data
