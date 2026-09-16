from django.urls import path

from .views import (
    AdminApplicationListView,
    AdminProcessCloseView,
    AdminProcessDetailView,
    AdminProcessListCreateView,
    AdminProcessPublishView,
    AdminStageDetailView,
    AdminStageListCreateView,
    AdminStageReorderView,
)

urlpatterns = [
    path(
        'admin/processes/',
        AdminProcessListCreateView.as_view(),
        name='admin-processes',
    ),
    path(
        'admin/processes/<uuid:pk>/',
        AdminProcessDetailView.as_view(),
        name='admin-process-detail',
    ),
    path(
        'admin/processes/<uuid:pk>/publish/',
        AdminProcessPublishView.as_view(),
        name='admin-process-publish',
    ),
    path(
        'admin/processes/<uuid:pk>/close/',
        AdminProcessCloseView.as_view(),
        name='admin-process-close',
    ),
    path(
        'admin/processes/<uuid:pk>/stages/',
        AdminStageListCreateView.as_view(),
        name='admin-stages',
    ),
    path(
        'admin/processes/<uuid:pk>/stages/reorder/',
        AdminStageReorderView.as_view(),
        name='admin-stages-reorder',
    ),
    path(
        'admin/stages/<uuid:pk>/',
        AdminStageDetailView.as_view(),
        name='admin-stage-detail',
    ),
    path(
        'admin/processes/<uuid:pk>/applications/',
        AdminApplicationListView.as_view(),
        name='admin-applications',
    ),
]
