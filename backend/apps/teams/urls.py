from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminTokenObtainPairView,
    EmailTokenObtainPairView,
    MeView,
    ParticipantListView,
    RegisterView,
    TeamDetailUpdateView,
    TeamLeaveView,
    TeamListCreateView,
    TeamRemoveMemberView,
    TeamSubmitView,
    health_check,
)

urlpatterns = [
    path('health/', health_check, name='health'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/token/', EmailTokenObtainPairView.as_view(), name='auth-token'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/admin/token/', AdminTokenObtainPairView.as_view(), name='auth-admin-token'),
    path('me/', MeView.as_view(), name='me'),
    path('participants/', ParticipantListView.as_view(), name='participants'),
    path('teams/', TeamListCreateView.as_view(), name='teams'),
    path('teams/<uuid:pk>/', TeamDetailUpdateView.as_view(), name='team-detail'),
    path('teams/<uuid:pk>/submit/', TeamSubmitView.as_view(), name='team-submit'),
    path('teams/<uuid:pk>/leave/', TeamLeaveView.as_view(), name='team-leave'),
    path(
        'teams/<uuid:pk>/members/<uuid:participant_id>/',
        TeamRemoveMemberView.as_view(),
        name='team-remove-member',
    ),
]
