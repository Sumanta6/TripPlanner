from rest_framework import serializers
from .models import SavedItinerary


class SavedItinerarySerializer(serializers.ModelSerializer):
    """Serializes a fully-saved itinerary for API responses."""

    class Meta:
        model = SavedItinerary
        fields = [
            'id', 'traveler', 'destination', 'starting_place',
            'start_date', 'end_date', 'days', 'budget', 'budget_plan', 'travelers', 'notes',
            'itinerary_data', 'created_at',
        ]
        read_only_fields = ['id', 'traveler', 'created_at']


class SavedItinerarySummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer (list view, without heavy itinerary_data)."""
    preview = serializers.SerializerMethodField()

    class Meta:
        model = SavedItinerary
        fields = [
            'id', 'destination', 'starting_place',
            'start_date', 'end_date', 'days', 'budget', 'budget_plan', 'travelers', 'notes', 'preview', 'created_at',
        ]
        read_only_fields = ['id', 'traveler', 'created_at']

    def get_preview(self, obj):
        try:
            return obj.itinerary_data.get('itinerary', {}).get('trip_summary', '')
        except Exception:
            return ""
