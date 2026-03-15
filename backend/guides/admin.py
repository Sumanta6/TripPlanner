from django.contrib import admin
from .models import GuideProfile, Booking, Activity


@admin.register(GuideProfile)
class GuideProfileAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'email', 'phone', 'specialization',
        'experience_years', 'rating', 'tours_completed', 'availability',
    ]
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
        'traveler_name', 'guide', 'destination',
        'trip_start', 'trip_end', 'status',
    ]
    list_filter = ['status', 'trip_start']
    search_fields = ['traveler_name', 'traveler_email', 'destination']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = []
    date_hierarchy = 'trip_start'


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['guide', 'activity_type', 'highlight', 'created_at']
    list_filter = ['activity_type']
    search_fields = ['highlight', 'message']
    readonly_fields = ['created_at']
