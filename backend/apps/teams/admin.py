from django.contrib import admin

from .models import Participant, Team


class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'title', 'status', 'created_at']
    list_filter = ['status']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [ParticipantInline]


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'team', 'is_leader']
    list_filter = ['is_leader']
