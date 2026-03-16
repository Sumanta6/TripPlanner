from rest_framework import serializers
from .models import GuideProfile, Booking, Activity


# ── GuideProfile ──────────────────────────────────────────────────────────────

class GuideProfileSerializer(serializers.ModelSerializer):
    """Full serializer – used for list and detail views."""

    class Meta:
        model = GuideProfile
        fields = [
            'id', 'full_name', 'email', 'phone', 'address',
            'profile_image', 'bio',
            'languages', 'specialization', 'destinations',
            'experience_years', 'rating', 'tours_completed',
            'availability', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class GuideProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Partial-update serializer for PATCH /api/guides/me/.
    Prevents direct editing of rating / tours_completed from the API.
    """

    class Meta:
        model = GuideProfile
        fields = [
            'full_name', 'phone', 'address', 'profile_image',
            'bio', 'languages', 'specialization', 'destinations',
            'experience_years', 'availability',
        ]


# ── Booking ───────────────────────────────────────────────────────────────────

class NestedItinerarySerializer(serializers.Serializer):
    """
    Lightweight nested representation of the linked SavedItinerary.
    Only the fields guides need to display the trip plan.
    """
    id = serializers.IntegerField(read_only=True)
    destination = serializers.CharField(read_only=True)
    starting_place = serializers.CharField(read_only=True)
    start_date = serializers.DateField(read_only=True)
    end_date = serializers.DateField(read_only=True)
    days = serializers.IntegerField(read_only=True)
    notes = serializers.CharField(read_only=True)
    itinerary_data = serializers.JSONField(read_only=True)


class BookingSerializer(serializers.ModelSerializer):
    """Booking serializer – includes avatar + nested itinerary if linked."""

    avatar = serializers.SerializerMethodField()
    itinerary = NestedItinerarySerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'guide', 'traveler_user',
            'traveler_name', 'traveler_email', 'traveler_phone',
            'destination', 'trip_start', 'trip_end',
            'status', 'notes', 'avatar', 'itinerary',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'guide', 'avatar', 'itinerary', 'created_at', 'updated_at']

    def get_avatar(self, obj):
        """Return initials from traveler_name, e.g. 'AB'."""
        parts = (obj.traveler_name or '').split()
        return ''.join(p[0].upper() for p in parts[:2]) or '?'


# ── Activity ──────────────────────────────────────────────────────────────────

class ActivitySerializer(serializers.ModelSerializer):

    time = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id', 'activity_type', 'message',
            'highlight', 'sub', 'time', 'created_at',
        ]
        read_only_fields = ['id', 'time', 'created_at']

    def get_time(self, obj):
        """Human-readable relative time label for the feed."""
        from django.utils import timezone
        import datetime

        now = timezone.now()
        diff = now - obj.created_at

        if diff < datetime.timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < datetime.timedelta(hours=24):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff < datetime.timedelta(days=2):
            return "Yesterday"
        else:
            days = diff.days
            return f"{days} days ago"


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardSerializer(serializers.Serializer):
    """
    Aggregated stats returned by GET /api/guides/me/dashboard/.
    Computed in the view — this serializer is for documentation / output only.
    """
    total_travelers = serializers.IntegerField()
    active_trips = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    upcoming_trips = serializers.IntegerField()
    completed_trips = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    top_destinations = serializers.ListField(child=serializers.DictField())
    rating = serializers.DecimalField(max_digits=3, decimal_places=1)
    tours_completed = serializers.IntegerField()
    experience_years = serializers.IntegerField()
    languages_count = serializers.IntegerField()
    destinations_count = serializers.IntegerField()
