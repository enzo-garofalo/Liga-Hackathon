from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminTokenObtainPairView,
    EmailTokenObtainPairView,
    MeView,
    ParticipantListView,
    RegisterView,
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
]
