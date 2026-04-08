from django.contrib import admin
from .models import GuideProfile, Booking, Activity, ChatMessage


@admin.register(GuideProfile)
class GuideProfileAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'full_name', 'email', 'phone', 'specialization',
        'experience_years', 'rating', 'tours_completed', 'availability',
    ]
    list_display_links = ['id', 'full_name', 'email']
    list_filter = ['availability', 'specialization']
    search_fields = ['full_name', 'email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Account', {
            'fields': ('user', 'full_name', 'email', 'profile_image')
        }),
        ('Contact', {
            'fields': ('phone', 'address')
        }),
        ('Professional', {
            'fields': (
                'bio', 'specialization', 'languages',
                'destinations', 'experience_years',
            )
        }),
        ('Stats & Status', {
            'fields': ('rating', 'tours_completed', 'availability')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)
        }),
    )


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'traveler_name', 'guide', 'destination',
        'trip_start', 'trip_end', 'status',
    ]
    list_display_links = ['id', 'traveler_name']
    list_filter = ['status', 'trip_start']
    search_fields = ['traveler_name', 'traveler_email', 'destination']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'trip_start'


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['id', 'guide', 'activity_type', 'highlight', 'created_at']
    list_display_links = ['id', 'activity_type']
    list_filter = ['activity_type']
    search_fields = ['highlight', 'message']
    readonly_fields = ['created_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'sender', 'sender_role', 'created_at']
    list_display_links = ['id', 'booking']
    list_filter = ['sender_role', 'created_at']
    search_fields = ['booking__traveler_name', 'booking__destination', 'message']
    readonly_fields = ['created_at']
