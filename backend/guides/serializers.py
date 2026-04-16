from django.db.models import Count
from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist

from .models import GuideProfile, Booking, Activity, Review, ChatMessage


CHAT_VIEWABLE_STATUSES = {'accepted', 'active', 'completed', 'cancelled', 'expired'}
CHAT_SENDABLE_STATUSES = {'accepted', 'active'}
TRAVELER_BLOCKING_STATUSES = {'pending', 'accepted', 'active'}


def build_profile_image_url(request, image_field):
    if not image_field:
        return ''
    image_url = image_field.url
    return request.build_absolute_uri(image_url) if request else image_url


def build_status_reason_display(obj):
    label = obj.get_status_reason_label() if hasattr(obj, 'get_status_reason_label') else ''
    note = (obj.status_reason_note or '').strip()
    if label and note:
        return f"{label}: {note}"
    return label or note


def serialize_booking_snapshot(booking):
    if not booking:
        return None
    return {
        'id': booking.id,
        'destination': booking.destination,
        'trip_start': booking.trip_start,
        'trip_end': booking.trip_end,
        'status': booking.status,
        'can_cancel': booking.status in {'pending', 'accepted'},
        'status_reason_label': booking.get_status_reason_label(),
        'status_reason_note': booking.status_reason_note,
        'status_reason_display': build_status_reason_display(booking),
        'status_updated_by_role': booking.status_updated_by_role,
        'created_at': booking.created_at,
        'updated_at': booking.updated_at,
    }


def get_request_window(request):
    from datetime import datetime

    if not request:
        return None, None

    trip_start_str = request.GET.get('trip_start')
    trip_end_str = request.GET.get('trip_end')
    if not trip_start_str or not trip_end_str:
        return None, None

    try:
        trip_start = datetime.strptime(trip_start_str, '%Y-%m-%d').date()
        trip_end = datetime.strptime(trip_end_str, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None, None

    if trip_end < trip_start:
        return None, None

    return trip_start, trip_end


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
    current_traveler_booking = serializers.SerializerMethodField()
    latest_traveler_booking = serializers.SerializerMethodField()
    can_request_now = serializers.SerializerMethodField()
    request_state_message = serializers.SerializerMethodField()
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
            'recent_reviews', 'current_traveler_booking', 'latest_traveler_booking',
            'can_request_now', 'request_state_message', 'tours_completed',
            'availability', 'availability_badge', 'booked_ranges', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'availability_badge', 'booked_ranges', 'current_traveler_booking',
            'latest_traveler_booking', 'can_request_now', 'request_state_message',
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

    def get_current_traveler_booking(self, obj):
        booking, _ = self._get_traveler_booking_state(obj)
        return serialize_booking_snapshot(booking)

    def get_latest_traveler_booking(self, obj):
        _, latest_booking = self._get_traveler_booking_state(obj)
        return serialize_booking_snapshot(latest_booking)

    def get_can_request_now(self, obj):
        user = self._get_authenticated_user()
        if not user:
            return True

        blocking_booking, _ = self._get_traveler_booking_state(obj)
        if blocking_booking:
            return False

        request_start, request_end = get_request_window(self.context.get('request'))
        if request_start and request_end:
            has_guide_conflict = obj.bookings.filter(
                status__in=['accepted', 'active'],
                trip_start__lte=request_end,
                trip_end__gte=request_start,
            ).exists()
            return not has_guide_conflict

        return True

    def get_request_state_message(self, obj):
        user = self._get_authenticated_user()
        blocking_booking, latest_booking = self._get_traveler_booking_state(obj)
        if blocking_booking:
            if blocking_booking.status == 'pending':
                return 'You already have a pending request with this guide for these dates.'
            if blocking_booking.status == 'accepted':
                return 'You already have an accepted booking with this guide for these dates.'
            if blocking_booking.status == 'active':
                return 'This guide is already assigned to your active trip for these dates.'

        request_start, request_end = get_request_window(self.context.get('request'))
        if request_start and request_end:
            has_guide_conflict = obj.bookings.filter(
                status__in=['accepted', 'active'],
                trip_start__lte=request_end,
                trip_end__gte=request_start,
            ).exists()
            if has_guide_conflict:
                return 'This guide is unavailable for the selected dates.'

        if user and latest_booking and latest_booking.status == 'cancelled':
            return 'Your previous booking was cancelled. You can send a new request if this guide is available.'

        return 'You can send a new request when your trip details are ready.'

    def _get_authenticated_user(self):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None
        return user

    def _get_traveler_booking_state(self, obj):
        user = self._get_authenticated_user()
        if not user:
            return None, None

        bookings = list(
            obj.bookings.filter(traveler_user=user).order_by('-created_at')
        )
        if not bookings:
            return None, None

        latest_booking = bookings[0]
        request_start, request_end = get_request_window(self.context.get('request'))

        if request_start and request_end:
            blocking_booking = next(
                (
                    item for item in bookings
                    if item.status in TRAVELER_BLOCKING_STATUSES
                    and item.trip_start <= request_end
                    and item.trip_end >= request_start
                ),
                None,
            )
        else:
            blocking_booking = next(
                (item for item in bookings if item.status in TRAVELER_BLOCKING_STATUSES),
                None,
            )

        return blocking_booking, latest_booking

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
    traveler_address = serializers.SerializerMethodField()
    traveler_bio = serializers.SerializerMethodField()
    traveler_travel_style = serializers.SerializerMethodField()
    traveler_preferred_destinations = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    status_reason_label = serializers.SerializerMethodField()
    status_reason_display = serializers.SerializerMethodField()
    can_view_chat = serializers.SerializerMethodField()
    can_send_chat = serializers.SerializerMethodField()
    can_chat = serializers.SerializerMethodField()
    chat_locked_message = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'guide', 'guide_name', 'traveler_user',
            'traveler_name', 'traveler_email', 'traveler_phone',
            'traveler_address', 'traveler_bio', 'traveler_travel_style', 'traveler_preferred_destinations',
            'destination', 'trip_start', 'trip_end',
            'status', 'status_reason_code', 'status_reason_label', 'status_reason_note',
            'status_reason_display', 'status_updated_by_role', 'notes', 'avatar', 'itinerary',
            'can_review', 'review', 'can_cancel',
            'can_view_chat', 'can_send_chat', 'can_chat', 'chat_locked_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'guide', 'status_reason_code', 'status_reason_label', 'status_reason_note',
            'status_reason_display', 'status_updated_by_role', 'avatar', 'itinerary',
            'can_review', 'review', 'can_cancel',
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
        if not self._can_share_contact_details(obj):
            return ''
        if obj.traveler_email:
            return obj.traveler_email
        if obj.traveler_user and obj.traveler_user.email:
            return obj.traveler_user.email
        return ''

    def get_traveler_phone(self, obj):
        if not self._can_share_contact_details(obj):
            return ''
        if obj.traveler_phone:
            return obj.traveler_phone
        profile = getattr(obj.traveler_user, 'traveler_profile', None) if obj.traveler_user else None
        return profile.phone if profile and profile.phone else ''

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

    def get_can_cancel(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
        return (
            obj.traveler_user_id == request.user.id and
            obj.status in {'pending', 'accepted'}
        )

    def get_status_reason_label(self, obj):
        return obj.get_status_reason_label()

    def get_status_reason_display(self, obj):
        return build_status_reason_display(obj)

    def get_traveler_address(self, obj):
        profile = getattr(obj.traveler_user, 'traveler_profile', None) if obj.traveler_user else None
        return profile.address if profile and profile.address else ''

    def get_traveler_bio(self, obj):
        profile = getattr(obj.traveler_user, 'traveler_profile', None) if obj.traveler_user else None
        return profile.bio if profile and profile.bio else ''

    def get_traveler_travel_style(self, obj):
        profile = getattr(obj.traveler_user, 'traveler_profile', None) if obj.traveler_user else None
        return profile.travel_style if profile and profile.travel_style else ''

    def get_traveler_preferred_destinations(self, obj):
        profile = getattr(obj.traveler_user, 'traveler_profile', None) if obj.traveler_user else None
        return profile.preferred_destinations if profile and profile.preferred_destinations else []

    def get_can_view_chat(self, obj):
        return obj.status in CHAT_VIEWABLE_STATUSES

    def get_can_send_chat(self, obj):
        return obj.status in CHAT_SENDABLE_STATUSES

    def get_can_chat(self, obj):
        return self.get_can_send_chat(obj)

    def get_chat_locked_message(self, obj):
        if self.get_can_view_chat(obj) and not self.get_can_send_chat(obj):
            return 'This conversation is closed because the booking has ended.'
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
    sender_avatar = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(read_only=True)
    receiver_id = serializers.IntegerField(read_only=True, allow_null=True)
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    booking_id = serializers.IntegerField(read_only=True)
    content = serializers.CharField(source='message', read_only=True)
    is_own = serializers.SerializerMethodField()
    is_current_user = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'booking', 'booking_id', 'sender_id', 'receiver_id', 'sender_email', 'sender_role', 'sender_name', 'sender_avatar',
            'message', 'content', 'is_own', 'is_current_user', 'created_at',
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

    def get_sender_avatar(self, obj):
        request = self.context.get('request')

        if obj.sender_role == 'guide':
            try:
                guide_profile = obj.sender.guide_profile
            except ObjectDoesNotExist:
                guide_profile = None

            return build_profile_image_url(request, guide_profile.profile_image if guide_profile else None)

        try:
            traveler_profile = obj.sender.traveler_profile
        except ObjectDoesNotExist:
            traveler_profile = None

        return build_profile_image_url(request, traveler_profile.profile_image if traveler_profile else None)

    def get_is_own(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and request.user.id == obj.sender_id)

    def get_is_current_user(self, obj):
        return self.get_is_own(obj)


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
    counterpart_avatar = serializers.CharField(allow_blank=True)
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
