from django.urls import path

from .views import (
    AdminApplicationDetailView,
    AdminApplicationListView,
    AdminBulkActionView,
    AdminCommunicationDetailView,
    AdminCommunicationListCreateView,
    AdminEvaluationView,
    AdminOrganizerProfileView,
    AdminProcessCloseView,
    AdminProcessDetailView,
    AdminProcessListCreateView,
<<<<<<< HEAD
=======
    AdminProcessAssignmentView,
    AdminProcessOrganizerDetailView,
    AdminProcessOrganizerView,
>>>>>>> feature/v3-processo-seletivo
    AdminProcessPublishView,
    AdminStageAssignmentView,
    AdminStageAutoDistributeView,
    AdminStageDetailView,
<<<<<<< HEAD
=======
    AdminStageInstructionsFileView,
>>>>>>> feature/v3-processo-seletivo
    AdminStageListCreateView,
    AdminStageReorderView,
    DeliverableDownloadView,
    MyApplicationDetailView,
    MyApplicationListView,
    MyDeliverableDetailView,
    MyDeliverableView,
    ProcessApplyView,
    ProcessDetailView,
<<<<<<< HEAD
    OpenProcessView,
    ProcessListView,
=======
    StageInstructionsFileDownloadView,
    OpenProcessView,
    ProcessListView,
    ProcessWithdrawView,
>>>>>>> feature/v3-processo-seletivo
)

urlpatterns = [
    # ── Candidato ────────────────────────────────────────────────
    # Aberto: a landing mostra o periodo de inscricoes a quem nem tem conta.
    path('open-process/', OpenProcessView.as_view(), name='open-process'),
    path('processes/', ProcessListView.as_view(), name='processes'),
    path('processes/<uuid:pk>/', ProcessDetailView.as_view(), name='process-detail'),
    path(
        'processes/<uuid:pk>/apply/',
        ProcessApplyView.as_view(),
        name='process-apply',
    ),
<<<<<<< HEAD
=======
    path(
        'processes/<uuid:pk>/withdraw/',
        ProcessWithdrawView.as_view(),
        name='process-withdraw',
    ),
>>>>>>> feature/v3-processo-seletivo
    path('me/applications/', MyApplicationListView.as_view(), name='my-applications'),
    path(
        'me/applications/<uuid:pk>/',
        MyApplicationDetailView.as_view(),
        name='my-application-detail',
    ),
    path(
        'me/applications/<uuid:pk>/deliverables/',
        MyDeliverableView.as_view(),
        name='my-deliverables',
    ),
    path(
        'me/applications/<uuid:pk>/deliverables/<uuid:deliverable_id>/',
        MyDeliverableDetailView.as_view(),
        name='my-deliverable-detail',
    ),
    path(
        'deliverables/<uuid:pk>/download/',
        DeliverableDownloadView.as_view(),
        name='deliverable-download',
    ),
    # ── Organizador ──────────────────────────────────────────────
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
<<<<<<< HEAD
=======
        'admin/stages/<uuid:pk>/instructions-file/',
        AdminStageInstructionsFileView.as_view(),
        name='admin-stage-instructions-file',
    ),
    path(
        'stages/<uuid:pk>/instructions-file/download/',
        StageInstructionsFileDownloadView.as_view(),
        name='stage-instructions-file-download',
    ),
    path(
>>>>>>> feature/v3-processo-seletivo
        'admin/processes/<uuid:pk>/applications/',
        AdminApplicationListView.as_view(),
        name='admin-applications',
    ),
    path(
        'admin/applications/<uuid:pk>/',
        AdminApplicationDetailView.as_view(),
        name='admin-application-detail',
    ),
    path(
        'admin/applications/<uuid:pk>/evaluations/',
        AdminEvaluationView.as_view(),
        name='admin-application-evaluations',
    ),
    path(
        'admin/processes/<uuid:pk>/applications/bulk-action/',
        AdminBulkActionView.as_view(),
        name='admin-bulk-action',
    ),
    path(
        'admin/processes/<uuid:pk>/communications/',
        AdminCommunicationListCreateView.as_view(),
        name='admin-communications',
    ),
    path(
        'admin/communications/<uuid:pk>/',
        AdminCommunicationDetailView.as_view(),
        name='admin-communication-detail',
    ),
    path(
<<<<<<< HEAD
=======
        'admin/processes/<uuid:pk>/assignments/',
        AdminProcessAssignmentView.as_view(),
        name='admin-process-assignments',
    ),
    path(
>>>>>>> feature/v3-processo-seletivo
        'admin/stages/<uuid:pk>/assignments/',
        AdminStageAssignmentView.as_view(),
        name='admin-stage-assignments',
    ),
    path(
        'admin/stages/<uuid:pk>/assignments/auto/',
        AdminStageAutoDistributeView.as_view(),
        name='admin-stage-auto-distribute',
    ),
    path(
<<<<<<< HEAD
=======
        'admin/processes/<uuid:pk>/organizers/',
        AdminProcessOrganizerView.as_view(),
        name='admin-process-organizers',
    ),
    path(
        'admin/processes/<uuid:pk>/organizers/<int:user_id>/',
        AdminProcessOrganizerDetailView.as_view(),
        name='admin-process-organizer-detail',
    ),
    path(
>>>>>>> feature/v3-processo-seletivo
        'admin/me/',
        AdminOrganizerProfileView.as_view(),
        name='admin-organizer-profile',
    ),
]
