import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_approval_email, send_rejection_email
from .models import Team
from .serializers import TeamSerializer

logger = logging.getLogger(__name__)


class TeamCreateView(generics.CreateAPIView):
    serializer_class = TeamSerializer
    permission_classes = []


class TeamDetailView(generics.RetrieveAPIView):
    queryset = Team.objects.prefetch_related('participants')
    serializer_class = TeamSerializer
    permission_classes = []


class AdminTeamListView(generics.ListAPIView):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Team.objects.prefetch_related('participants')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class AdminTeamApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        if team.status != Team.STATUS_PENDING:
            return Response(
                {'detail': 'Apenas equipes pendentes podem ser aprovadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            approved_count = (
                Team.objects.select_for_update().filter(status=Team.STATUS_APPROVED).count()
            )
            if approved_count >= 10:
                return Response(
                    {'detail': 'Limite de 10 equipes aprovadas atingido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            team.status = Team.STATUS_APPROVED
            team.save()

        try:
            send_approval_email(team)
        except Exception:
            logger.exception('Falha ao enviar e-mail de aprovação para equipe %s', team.id)

        return Response(TeamSerializer(team).data)


class AdminTeamRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        if team.status != Team.STATUS_PENDING:
            return Response(
                {'detail': 'Apenas equipes pendentes podem ser recusadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            team.status = Team.STATUS_REJECTED
            team.save()

        try:
            send_rejection_email(team)
        except Exception:
            logger.exception('Falha ao enviar e-mail de recusa para equipe %s', team.id)

        return Response(TeamSerializer(team).data)
