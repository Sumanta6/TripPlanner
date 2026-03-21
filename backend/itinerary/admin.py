from django.contrib import admin
from .models import SavedItinerary

@admin.register(SavedItinerary)
class SavedItineraryAdmin(admin.ModelAdmin):
    list_display = ('id', 'traveler', 'destination', 'start_date', 'days', 'budget', 'created_at')
    list_display_links = ('id', 'traveler', 'destination')
    list_filter = ('destination', 'created_at')
    search_fields = ('destination', 'traveler__username', 'traveler__email')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('traveler')
