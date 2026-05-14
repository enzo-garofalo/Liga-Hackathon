from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Participant

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
