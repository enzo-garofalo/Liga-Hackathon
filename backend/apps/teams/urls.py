from django.urls import path

from .views import (
    AdminTeamApproveView,
    AdminTeamListView,
    AdminTeamRejectView,
    TeamCreateView,
    TeamDetailView,
    health_check,
)

urlpatterns = [
    path('health/', health_check, name='health'),
    path('teams/', TeamCreateView.as_view(), name='team-create'),
    path('teams/<uuid:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('admin/teams/', AdminTeamListView.as_view(), name='admin-team-list'),
    path('admin/teams/<uuid:pk>/approve/', AdminTeamApproveView.as_view(), name='admin-team-approve'),
    path('admin/teams/<uuid:pk>/reject/', AdminTeamRejectView.as_view(), name='admin-team-reject'),
]
