from django.http import Http404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Participant
from .serializers import (
    AdminTokenObtainPairSerializer,
    EmailTokenObtainPairSerializer,
    MeSerializer,
    ParticipantListSerializer,
    ParticipantPublicSerializer,
    RegisterSerializer,
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
