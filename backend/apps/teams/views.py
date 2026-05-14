from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import InviteStatus, JoinRequest, Participant, Team, TeamInvite
from .serializers import (
    AdminTokenObtainPairSerializer,
    EmailTokenObtainPairSerializer,
    JoinRequestCreateSerializer,
    JoinRequestSerializer,
    MeSerializer,
    ParticipantListSerializer,
    ParticipantPublicSerializer,
    RegisterSerializer,
    TeamCreateSerializer,
    TeamInviteCreateSerializer,
    TeamInviteSerializer,
    TeamSerializer,
    TeamUpdateSerializer,
)
from .services.teams import (
    accept_invite,
    accept_join_request,
    assert_is_leader,
    assert_team_forming,
    decline_invite,
    decline_join_request,
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
        get_request_participant(request)
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


class TeamInviteCreateView(APIView):
    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        actor = get_request_participant(request)
        assert_is_leader(team, actor)
        serializer = TeamInviteCreateSerializer(
            data=request.data,
            context={'team': team, 'invited_by': actor, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        invite = serializer.save()
        return Response(
            TeamInviteSerializer(invite).data, status=status.HTTP_201_CREATED
        )


class MyInvitesListView(generics.ListAPIView):
    serializer_class = TeamInviteSerializer

    def get_queryset(self):
        participant = get_request_participant(self.request)
        return (
            TeamInvite.objects
            .filter(invitee=participant, status=InviteStatus.PENDING)
            .select_related('team', 'invited_by')
        )


class InviteAcceptView(APIView):
    def post(self, request, pk):
        participant = get_request_participant(request)
        invite = get_object_or_404(TeamInvite, pk=pk, invitee=participant)
        accept_invite(invite, participant)
        invite.refresh_from_db()
        return Response(TeamInviteSerializer(invite).data)


class InviteDeclineView(APIView):
    def post(self, request, pk):
        participant = get_request_participant(request)
        invite = get_object_or_404(TeamInvite, pk=pk, invitee=participant)
        decline_invite(invite, participant)
        invite.refresh_from_db()
        return Response(TeamInviteSerializer(invite).data)


class TeamJoinRequestListCreateView(APIView):
    def get(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        actor = get_request_participant(request)
        assert_is_leader(team, actor)
        queryset = (
            JoinRequest.objects
            .filter(team=team, status=InviteStatus.PENDING)
            .select_related('requester', 'team')
        )
        return Response(JoinRequestSerializer(queryset, many=True).data)

    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        requester = get_request_participant(request)
        serializer = JoinRequestCreateSerializer(
            data=request.data,
            context={'team': team, 'requester': requester, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        req = serializer.save()
        return Response(
            JoinRequestSerializer(req).data, status=status.HTTP_201_CREATED
        )


class JoinRequestAcceptView(APIView):
    def post(self, request, pk, request_id):
        team = get_object_or_404(Team, pk=pk)
        actor = get_request_participant(request)
        assert_is_leader(team, actor)
        req = get_object_or_404(JoinRequest, pk=request_id, team=team)
        accept_join_request(req, actor)
        req.refresh_from_db()
        return Response(JoinRequestSerializer(req).data)


class JoinRequestDeclineView(APIView):
    def post(self, request, pk, request_id):
        team = get_object_or_404(Team, pk=pk)
        actor = get_request_participant(request)
        assert_is_leader(team, actor)
        req = get_object_or_404(JoinRequest, pk=request_id, team=team)
        decline_join_request(req, actor)
        req.refresh_from_db()
        return Response(JoinRequestSerializer(req).data)
