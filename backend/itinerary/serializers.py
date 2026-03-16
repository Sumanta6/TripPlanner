from rest_framework import serializers
from .models import SavedItinerary


class SavedItinerarySerializer(serializers.ModelSerializer):
    """Serializes a fully-saved itinerary for API responses."""

    class Meta:
        model = SavedItinerary
        fields = [
            'id', 'traveler', 'destination', 'starting_place',
            'start_date', 'end_date', 'days', 'notes',
            'itinerary_data', 'created_at',
        ]
        read_only_fields = ['id', 'traveler', 'created_at']


class SavedItinerarySummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer (list view, without heavy itinerary_data)."""

    class Meta:
        model = SavedItinerary
        fields = [
            'id', 'destination', 'starting_place',
            'start_date', 'end_date', 'days', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'traveler', 'created_at']
