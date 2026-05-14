from django.contrib import admin

from .models import (
    HackathonInfo,
    JoinRequest,
    Notification,
    Participant,
    Team,
    TeamInvite,
    TeamMembership,
)


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'user', 'course', 'semester', 'created_at']
    list_filter = ['course', 'semester']
    search_fields = ['full_name', 'user__email', 'user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'leader', 'status', 'is_open', 'submitted_at', 'created_at']
    list_filter = ['status', 'is_open']
    search_fields = ['name', 'leader__full_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ['team', 'participant', 'joined_at']
    search_fields = ['team__name', 'participant__full_name']
    readonly_fields = ['id', 'joined_at']


@admin.register(TeamInvite)
class TeamInviteAdmin(admin.ModelAdmin):
    list_display = ['team', 'invitee', 'invited_by', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['team__name', 'invitee__full_name', 'invited_by__full_name']
    readonly_fields = ['id', 'created_at']


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ['team', 'requester', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['team__name', 'requester__full_name']
    readonly_fields = ['id', 'created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['participant', 'type', 'read', 'created_at']
    list_filter = ['type', 'read']
    search_fields = ['participant__full_name']
    readonly_fields = ['id', 'created_at']


@admin.register(HackathonInfo)
class HackathonInfoAdmin(admin.ModelAdmin):
    list_display = ['updated_at']
    readonly_fields = ['updated_at']

    def has_add_permission(self, request):
        return not HackathonInfo.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
