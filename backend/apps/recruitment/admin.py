from django.contrib import admin

from .models import (
    Application,
    Communication,
    Deliverable,
    Evaluation,
    EvaluationCriterion,
    OrganizerProfile,
    Process,
    ProcessOrganizer,
    Stage,
    StageAssignment,
)


class StageInline(admin.TabularInline):
    model = Stage
    extra = 0
    fields = ['order', 'name', 'start_at', 'end_at', 'allows_file_upload']
    ordering = ['order']


@admin.register(Process)
class ProcessAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'registration_start', 'registration_end', 'created_at']
    list_filter = ['status']
    search_fields = ['name']
    readonly_fields = ['id', 'published_at', 'created_at', 'updated_at']
    inlines = [StageInline]


class EvaluationCriterionInline(admin.TabularInline):
    model = EvaluationCriterion
    extra = 0
    ordering = ['order']


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ['name', 'process', 'order', 'start_at', 'end_at', 'allows_file_upload']
    list_filter = ['process', 'allows_file_upload']
    search_fields = ['name', 'process__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [EvaluationCriterionInline]


@admin.register(EvaluationCriterion)
class EvaluationCriterionAdmin(admin.ModelAdmin):
    list_display = ['name', 'stage', 'order']
    list_filter = ['stage__process']
    search_fields = ['name', 'stage__name']
    readonly_fields = ['id']


class DeliverableInline(admin.TabularInline):
    model = Deliverable
    extra = 0
    fields = ['stage', 'file', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['participant', 'process', 'current_stage', 'status', 'updated_at']
    list_filter = ['process', 'status', 'current_stage']
    search_fields = ['participant__full_name', 'participant__user__email']
    readonly_fields = ['id', 'submitted_at', 'created_at', 'updated_at']
    inlines = [DeliverableInline]


@admin.register(Deliverable)
class DeliverableAdmin(admin.ModelAdmin):
    list_display = ['application', 'stage', 'file', 'uploaded_at']
    list_filter = ['stage__process', 'stage']
    readonly_fields = ['id', 'uploaded_at']


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ['application', 'stage', 'criterion', 'evaluator', 'score']
    list_filter = ['stage__process', 'stage', 'evaluator']
    search_fields = ['application__participant__full_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = ['subject', 'process', 'type', 'audience', 'status', 'sent_at']
    list_filter = ['process', 'type', 'audience', 'status']
    search_fields = ['subject']
    readonly_fields = ['id', 'sent_at']
    filter_horizontal = ['recipients']


@admin.register(OrganizerProfile)
class OrganizerProfileAdmin(admin.ModelAdmin):
    # `is_coordinator` na lista porque é a única distinção de papel que concede
    # algo: ver a identidade na correção anônima. `role_title` é informativo.
    # Sem isto, saber quem é coordenador exige abrir perfil por perfil.
    list_display = ['full_name', 'user', 'role_title', 'is_coordinator']
    list_filter = ['is_coordinator']
    list_editable = ['is_coordinator']
    search_fields = ['full_name', 'user__email', 'role_title']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ProcessOrganizer)
class ProcessOrganizerAdmin(admin.ModelAdmin):
    # Quem foi chamado para cada processo. Coordenador não entra por aqui:
    # coordenação é `OrganizerProfile.is_coordinator`, marcado a mão.
    list_display = ['user', 'process', 'invited_by', 'created_at']
    list_filter = ['process']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['id', 'created_at']


@admin.register(StageAssignment)
class StageAssignmentAdmin(admin.ModelAdmin):
    list_display = ['stage', 'application', 'evaluator', 'created_at']
    list_filter = ['stage__process', 'stage', 'evaluator']
    search_fields = ['application__code', 'application__participant__full_name']
    readonly_fields = ['id', 'created_at']
