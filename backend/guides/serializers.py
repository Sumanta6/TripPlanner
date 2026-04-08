from django.db.models import Count
from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist

from .models import GuideProfile, Booking, Activity, Review, ChatMessage


def build_review_breakdown(guide):
    counts = {
        item['rating']: item['count']
        for item in guide.reviews.values('rating').annotate(count=Count('id'))
    }
    total = sum(counts.values())
    rows = []
    for stars in range(5, 0, -1):
        count = counts.get(stars, 0)
        percentage = round((count / total) * 100) if total else 0
        rows.append({
            'stars': stars,
            'count': count,
            'percentage': percentage,
        })
    return rows


# ── GuideProfile ──────────────────────────────────────────────────────────────

class ReviewSummarySerializer(serializers.ModelSerializer):
    traveler_name = serializers.SerializerMethodField()
    traveler_avatar = serializers.SerializerMethodField()
    trip_type = serializers.CharField(source='booking.destination', read_only=True)
    trip_start = serializers.DateField(source='booking.trip_start', read_only=True)
    trip_end = serializers.DateField(source='booking.trip_end', read_only=True)
    verified_label = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'rating', 'comment',
            'traveler_name', 'traveler_avatar',
            'trip_type', 'trip_start', 'trip_end',
            'verified_label', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_traveler_name(self, obj):
        if hasattr(obj.traveler, 'traveler_profile') and obj.traveler.traveler_profile.full_name:
            return obj.traveler.traveler_profile.full_name
        return obj.traveler.get_full_name() or obj.traveler.username

    def get_traveler_avatar(self, obj):
        if hasattr(obj.traveler, 'traveler_profile') and obj.traveler.traveler_profile.profile_image:
            request = self.context.get('request')
            image_url = obj.traveler.traveler_profile.profile_image.url
            return request.build_absolute_uri(image_url) if request else image_url
        return ''

    def get_verified_label(self, obj):
        return 'Verified completed trip'


class GuideProfileSerializer(serializers.ModelSerializer):
    """Full serializer – used for list and detail views."""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    availability_badge = serializers.SerializerMethodField()
    booked_ranges = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    rating_breakdown = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()

    class Meta:
        model = GuideProfile
        fields = [
            'id', 'user_id', 'full_name', 'email', 'phone', 'address',
            'profile_image', 'bio',
            'languages', 'specialization', 'destinations',
            'experience_years', 'rating', 'review_count', 'rating_breakdown',
            'recent_reviews', 'tours_completed',
            'availability', 'availability_badge', 'booked_ranges', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'availability_badge', 'booked_ranges',
            'rating', 'review_count', 'rating_breakdown', 'recent_reviews',
        ]

    def get_availability_badge(self, obj):
        from django.utils import timezone
        import datetime

        request = self.context.get('request')
        query_params = request.GET if request else {}

        trip_start_str = query_params.get('trip_start')
        trip_end_str = query_params.get('trip_end')

        check_start = None
        check_end = None

        if trip_start_str and trip_end_str:
            try:
                check_start = datetime.datetime.strptime(trip_start_str, '%Y-%m-%d').date()
                check_end = datetime.datetime.strptime(trip_end_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass

        today = timezone.now().date()

        if check_start and check_end:
            conflict = obj.bookings.filter(
                status__in=['accepted', 'active'],
                trip_start__lte=check_end,
                trip_end__gte=check_start
            ).exists()
            if conflict:
                return "Unavailable for these dates"

        upcoming_trip = obj.bookings.filter(
            status__in=['accepted', 'active'],
            trip_end__gte=today
        ).order_by('trip_start').first()

        if upcoming_trip:
            if upcoming_trip.trip_start <= today:
                return f"Booked until {upcoming_trip.trip_end.strftime('%b %d')}"
            return f"Booked (starts {upcoming_trip.trip_start.strftime('%b %d')})"

        return "Available"

    def get_booked_ranges(self, obj):
        return list(obj.bookings.filter(
            status__in=['accepted', 'active']
        ).values('trip_start', 'trip_end'))

    def get_rating(self, obj):
        review_count = obj.reviews.count()
        if not review_count:
            return 0
        total = sum(review.rating for review in obj.reviews.all())
        return round(total / review_count, 1)

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_rating_breakdown(self, obj):
        return build_review_breakdown(obj)

    def get_recent_reviews(self, obj):
        reviews = obj.reviews.select_related('traveler', 'traveler__traveler_profile', 'booking')[:3]
        return ReviewSummarySerializer(reviews, many=True, context=self.context).data


class GuideProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideProfile
        fields = [
            'full_name', 'phone', 'address', 'profile_image',
            'bio', 'languages', 'specialization', 'destinations',
            'experience_years', 'availability',
        ]


# ── Booking ───────────────────────────────────────────────────────────────────

class NestedItinerarySerializer(serializers.Serializer):
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
    guide_name = serializers.CharField(source='guide.full_name', read_only=True)
    traveler_email = serializers.SerializerMethodField()
    traveler_phone = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()
    can_view_chat = serializers.SerializerMethodField()
    can_send_chat = serializers.SerializerMethodField()
    can_chat = serializers.SerializerMethodField()
    chat_locked_message = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'guide', 'guide_name', 'traveler_user',
            'traveler_name', 'traveler_email', 'traveler_phone',
            'destination', 'trip_start', 'trip_end',
            'status', 'notes', 'avatar', 'itinerary',
            'can_review', 'review',
            'can_view_chat', 'can_send_chat', 'can_chat', 'chat_locked_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'guide', 'avatar', 'itinerary',
            'can_review', 'review',
            'can_view_chat', 'can_send_chat', 'can_chat', 'chat_locked_message',
            'created_at', 'updated_at',
        ]

    def get_avatar(self, obj):
        if obj.traveler_user and hasattr(obj.traveler_user, 'traveler_profile'):
            profile = obj.traveler_user.traveler_profile
            if profile.profile_image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_image.url)
                return profile.profile_image.url

        parts = (obj.traveler_name or '').split()
        return ''.join(p[0].upper() for p in parts[:2]) or '?'

    def _can_share_contact_details(self, obj):
        if not self.context.get('restrict_guide_communication'):
            return True
        return obj.status in {'accepted', 'active'}

    def get_traveler_email(self, obj):
        return obj.traveler_email if self._can_share_contact_details(obj) else ''

    def get_traveler_phone(self, obj):
        return obj.traveler_phone if self._can_share_contact_details(obj) else ''

    def get_can_review(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
        return (
            obj.traveler_user_id == request.user.id and
            obj.status == 'completed' and
            not hasattr(obj, 'review')
        )

    def get_review(self, obj):
        if not hasattr(obj, 'review'):
            return None
        return ReviewSummarySerializer(obj.review, context=self.context).data

    def get_can_view_chat(self, obj):
        return obj.status in {'accepted', 'active', 'completed'}

    def get_can_send_chat(self, obj):
        return obj.status in {'accepted', 'active'}

    def get_can_chat(self, obj):
        return self.get_can_send_chat(obj)

    def get_chat_locked_message(self, obj):
        if self.get_can_view_chat(obj):
            return ''
        return 'Chat available after acceptance'


# ── Reviews ───────────────────────────────────────────────────────────────────

class ReviewWriteSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Review
        fields = ['id', 'booking_id', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate(self, attrs):
        request = self.context['request']
        booking_id = attrs.get('booking_id') or getattr(self.instance, 'booking_id', None)

        try:
            booking = Booking.objects.select_related('guide').get(pk=booking_id)
        except Booking.DoesNotExist:
            raise serializers.ValidationError({'booking_id': 'Booking not found.'})

        if booking.traveler_user_id != request.user.id:
            raise serializers.ValidationError({'booking_id': 'You can only review your own completed bookings.'})

        if booking.status != 'completed':
            raise serializers.ValidationError({'booking_id': 'Reviews are only allowed after a completed booking.'})

        if self.instance is None and hasattr(booking, 'review'):
            raise serializers.ValidationError({'booking_id': 'This completed booking already has a review.'})

        attrs['booking'] = booking
        attrs['guide'] = booking.guide
        attrs['traveler'] = request.user
        return attrs

    def create(self, validated_data):
        validated_data.pop('booking_id', None)
        return super().create(validated_data)


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(read_only=True)
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    booking_id = serializers.IntegerField(read_only=True)
    content = serializers.CharField(source='message', read_only=True)
    is_own = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'booking', 'booking_id', 'sender_id', 'sender_email', 'sender_role', 'sender_name',
            'message', 'content', 'is_own', 'created_at',
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):
        if obj.sender_role == 'guide':
            try:
                guide_profile = obj.sender.guide_profile
            except ObjectDoesNotExist:
                guide_profile = None

            if guide_profile and guide_profile.full_name:
                return guide_profile.full_name
            return obj.sender.get_full_name() or obj.sender.username

        try:
            traveler_profile = obj.sender.traveler_profile
        except ObjectDoesNotExist:
            traveler_profile = None

        if traveler_profile and traveler_profile.full_name:
            return traveler_profile.full_name
        return obj.sender.get_full_name() or obj.sender.username

    def get_is_own(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and request.user.id == obj.sender_id)


class ChatThreadSerializer(serializers.Serializer):
    current_user_id = serializers.IntegerField()
    current_user_email = serializers.EmailField(allow_blank=True)
    viewer_role = serializers.CharField()
    booking_id = serializers.IntegerField()
    guide_user_id = serializers.IntegerField(allow_null=True)
    traveler_user_id = serializers.IntegerField(allow_null=True)
    booking_status = serializers.CharField()
    destination = serializers.CharField()
    counterpart_name = serializers.CharField()
    counterpart_email = serializers.CharField(allow_blank=True)
    can_view_chat = serializers.BooleanField()
    can_send_chat = serializers.BooleanField()
    can_chat = serializers.BooleanField()
    locked_message = serializers.CharField(allow_blank=True)
    messages = ChatMessageSerializer(many=True)


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
        from django.utils import timezone
        import datetime

        now = timezone.now()
        diff = now - obj.created_at

        if diff < datetime.timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        if diff < datetime.timedelta(hours=24):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        if diff < datetime.timedelta(days=2):
            return "Yesterday"
        days = diff.days
        return f"{days} days ago"


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardSerializer(serializers.Serializer):
    total_travelers = serializers.IntegerField()
    active_trips = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    upcoming_trips = serializers.IntegerField()
    completed_trips = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    top_destinations = serializers.ListField(child=serializers.DictField())
    rating = serializers.DecimalField(max_digits=3, decimal_places=1)
    tours_completed = serializers.IntegerField()
    experience_years = serializers.DecimalField(max_digits=4, decimal_places=1)
    languages_count = serializers.IntegerField()
    destinations_count = serializers.IntegerField()
