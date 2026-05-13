from rest_framework import serializers

from .models import Participant, Team


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'full_name', 'email', 'phone', 'ra', 'github', 'is_leader']


class TeamSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'title', 'proposal', 'status', 'created_at', 'updated_at', 'participants']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

    def validate_participants(self, participants):
        if len(participants) != 4:
            raise serializers.ValidationError('A equipe deve ter exatamente 4 participantes.')
        leaders = [p for p in participants if p.get('is_leader')]
        if len(leaders) != 1:
            raise serializers.ValidationError('A equipe deve ter exatamente 1 líder.')
        return participants

    def create(self, validated_data):
        participants_data = validated_data.pop('participants')
        team = Team.objects.create(**validated_data)
        Participant.objects.bulk_create([
            Participant(team=team, **p) for p in participants_data
        ])
        return team
