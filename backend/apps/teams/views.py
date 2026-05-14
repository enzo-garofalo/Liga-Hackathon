from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Participant, Team
from .serializers import (
    AdminTokenObtainPairSerializer,
    EmailTokenObtainPairSerializer,
    MeSerializer,
    ParticipantListSerializer,
    ParticipantPublicSerializer,
    RegisterSerializer,
    TeamCreateSerializer,
    TeamSerializer,
    TeamUpdateSerializer,
)
from .services.teams import (
    assert_is_leader,
    assert_team_forming,
    get_request_participant,
    leave_team,
    remove_member,
    submit_team,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok'})


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant = serializer.save()
        return Response(
            ParticipantPublicSerializer(participant).data,
            status=status.HTTP_201_CREATED,
        )


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        try:
            return self.request.user.participant
        except Participant.DoesNotExist:
            raise Http404('Usuário autenticado não possui perfil de participante.')


class ParticipantListView(generics.ListAPIView):
    serializer_class = ParticipantListSerializer

    def get_queryset(self):
        queryset = Participant.objects.filter(memberships__isnull=True)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(full_name__icontains=search)
        return queryset


class TeamListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return (
            Team.objects.filter(is_open=True, status=Team.STATUS_FORMING)
            .select_related('leader')
        )

    def get_serializer_class(self):
        return TeamCreateSerializer if self.request.method == 'POST' else TeamSerializer

    def create(self, request, *args, **kwargs):
        get_request_participant(request)  # ensures the caller has a profile
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        team = serializer.save()
        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)


class TeamDetailUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Team.objects.all()
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        return TeamUpdateSerializer if self.request.method == 'PATCH' else TeamSerializer

    def update(self, request, *args, **kwargs):
        team = self.get_object()
        participant = get_request_participant(request)
        assert_is_leader(team, participant)
        assert_team_forming(team)
        serializer = self.get_serializer(team, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TeamSerializer(team).data)


class TeamSubmitView(APIView):
    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        participant = get_request_participant(request)
        assert_is_leader(team, participant)
        team = submit_team(team)
        return Response(TeamSerializer(team).data)


class TeamLeaveView(APIView):
    def delete(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        participant = get_request_participant(request)
        leave_team(team, participant)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamRemoveMemberView(APIView):
    def delete(self, request, pk, participant_id):
        team = get_object_or_404(Team, pk=pk)
        actor = get_request_participant(request)
        assert_is_leader(team, actor)
        target = get_object_or_404(Participant, pk=participant_id)
        remove_member(team, target)
        return Response(status=status.HTTP_204_NO_CONTENT)
