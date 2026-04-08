from django.db import OperationalError, ProgrammingError
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Activity, Booking, ChatMessage, GuideProfile, Review
from .serializers import (
    ActivitySerializer,
    BookingSerializer,
    ChatMessageSerializer,
    ChatThreadSerializer,
    DashboardSerializer,
    GuideProfileSerializer,
    GuideProfileUpdateSerializer,
    ReviewSummarySerializer,
    ReviewWriteSerializer,
)


def get_or_create_guide_profile(user):
    """Return the GuideProfile for a user, creating one if it doesn't exist."""
    profile, _ = GuideProfile.objects.get_or_create(
        user=user,
        defaults={
            'full_name': user.get_full_name() or user.username,
            'email': user.email,
        },
    )
    return profile


def get_chat_booking_for_user(user, pk):
    """Return a booking only if the current user is the guide or traveler on it."""
    booking = Booking.objects.select_related(
        'guide', 'guide__user', 'traveler_user', 'traveler_user__traveler_profile'
    ).filter(pk=pk).first()

    if not booking:
        return None

    guide_user_id = booking.guide.user_id
    traveler_user_id = booking.traveler_user_id

    if user.id not in {guide_user_id, traveler_user_id}:
        return None

    return booking


def build_chat_thread_payload(booking, request):
    is_guide = booking.guide.user_id == request.user.id
    viewer_role = 'guide' if is_guide else 'traveler'
    counterpart_name = booking.traveler_name if is_guide else (booking.guide.full_name or booking.guide.user.username)
    counterpart_email = booking.traveler_email if is_guide else (booking.guide.email or booking.guide.user.email or '')
    can_view_chat = booking.status in {'accepted', 'active', 'completed'}
    can_send_chat = booking.status in {'accepted', 'active'}
    locked_message = '' if can_view_chat else 'Chat available after acceptance'
    messages = ChatMessage.objects.select_related('sender').filter(booking=booking).order_by('created_at')

    return {
        'current_user_id': request.user.id,
        'current_user_email': request.user.email or '',
        'viewer_role': viewer_role,
        'booking_id': booking.id,
        'guide_user_id': booking.guide.user_id,
        'traveler_user_id': booking.traveler_user_id,
        'booking_status': booking.status,
        'destination': booking.destination,
        'counterpart_name': counterpart_name,
        'counterpart_email': counterpart_email,
        'can_view_chat': can_view_chat,
        'can_send_chat': can_send_chat,
        'can_chat': can_send_chat,
        'locked_message': locked_message,
        'messages': messages,
    }


def update_outdated_booking_statuses(bookings):
    """Dynamically progression of accepted -> active -> completed based on current date."""
    from django.utils import timezone

    today = timezone.now().date()
    updated = []

    for booking in bookings:
        if booking.status == 'accepted' and today >= booking.trip_start and today <= booking.trip_end:
            booking.status = 'active'
            updated.append(booking)
        elif booking.status in ['accepted', 'active'] and today > booking.trip_end:
            booking.status = 'completed'
            updated.append(booking)

    if updated:
        Booking.objects.bulk_update(updated, ['status'])


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_list(request):
    """
    GET /api/guides/
    Returns a list of all registered guides (public).
    """
    guides = GuideProfile.objects.select_related('user').prefetch_related(
        'reviews',
        'reviews__traveler',
        'reviews__traveler__traveler_profile',
        'reviews__booking',
    ).all()
    for guide in guides:
        update_outdated_booking_statuses(guide.bookings.all())

    serializer = GuideProfileSerializer(guides, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_detail(request, pk):
    """
    GET /api/guides/<id>/
    Returns the public profile of a single guide.
    """
    try:
        guide = GuideProfile.objects.select_related('user').prefetch_related(
            'reviews',
            'reviews__traveler',
            'reviews__traveler__traveler_profile',
            'reviews__booking',
        ).get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    update_outdated_booking_statuses(guide.bookings.all())
    serializer = GuideProfileSerializer(guide, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_reviews(request, pk):
    """
    GET /api/guides/<id>/reviews/
    Returns verified reviews for a guide.
    """
    try:
        guide = GuideProfile.objects.get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    reviews = guide.reviews.select_related(
        'traveler', 'traveler__traveler_profile', 'booking'
    ).all()
    serializer = ReviewSummarySerializer(reviews, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_guide(request, pk):
    """
    POST /api/guides/<id>/request/
    Create a new Booking (request) for the specified guide.
    """
    try:
        guide = GuideProfile.objects.get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = dict(request.data) if hasattr(request.data, 'dict') else request.data.copy()

    from itinerary.models import SavedItinerary

    itinerary_id = data.get('itinerary_id')
    linked_itinerary = None
    if itinerary_id:
        try:
            linked_itinerary = SavedItinerary.objects.get(id=itinerary_id, traveler=request.user)
            if not data.get('destination'):
                data['destination'] = linked_itinerary.destination
            if not data.get('trip_start') and linked_itinerary.start_date:
                data['trip_start'] = linked_itinerary.start_date
            if not data.get('trip_end') and linked_itinerary.end_date:
                data['trip_end'] = linked_itinerary.end_date
        except SavedItinerary.DoesNotExist:
            return Response({'error': 'Saved itinerary not found.'}, status=status.HTTP_404_NOT_FOUND)

    destination = data.get('destination', '')
    if isinstance(destination, list):
        destination = destination[0]
    destination = str(destination).strip()

    trip_start = data.get('trip_start')
    if isinstance(trip_start, list):
        trip_start = trip_start[0]

    trip_end = data.get('trip_end')
    if isinstance(trip_end, list):
        trip_end = trip_end[0]

    if not destination:
        return Response({'error': 'Destination is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not trip_start:
        return Response({'error': 'Start date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not trip_end:
        return Response({'error': 'End date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if trip_end < trip_start:
        return Response({'error': 'End date cannot be earlier than start date.'}, status=status.HTTP_400_BAD_REQUEST)

    overlapping = Booking.objects.filter(
        guide=guide,
        status__in=['accepted', 'active'],
        trip_start__lte=trip_end,
        trip_end__gte=trip_start
    ).exists()
    if overlapping:
        return Response({'error': 'Guide is unavailable for selected dates.'}, status=status.HTTP_400_BAD_REQUEST)

    if hasattr(request.user, 'traveler_profile'):
        traveler_profile = request.user.traveler_profile
        data['traveler_name'] = data.get('traveler_name') or traveler_profile.full_name or request.user.username
        data['traveler_phone'] = data.get('traveler_phone') or traveler_profile.phone
    else:
        data['traveler_name'] = data.get('traveler_name') or request.user.username

    data['traveler_email'] = data.get('traveler_email') or request.user.email

    serializer = BookingSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        save_kwargs = {'guide': guide}
        if request.user.is_authenticated:
            save_kwargs['traveler_user'] = request.user
        if linked_itinerary:
            save_kwargs['itinerary'] = linked_itinerary

        booking = serializer.save(**save_kwargs)
        Activity.objects.create(
            guide=guide,
            activity_type='request',
            message=f"New guide request from {booking.traveler_name}",
            highlight=f"To {booking.destination}",
            sub=f"{booking.trip_start} to {booking.trip_end}"
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    GET  /api/guides/me/  – Return the logged-in guide's profile.
    PATCH /api/guides/me/ – Partially update profile fields.
    """
    guide = get_or_create_guide_profile(request.user)

    if request.method == 'GET':
        serializer = GuideProfileSerializer(guide, context={'request': request})
        return Response(serializer.data)

    serializer = GuideProfileUpdateSerializer(guide, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(GuideProfileSerializer(guide, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bookings(request):
    """
    GET /api/guides/me/bookings/
    Returns all bookings (travelers) assigned to the logged-in guide.
    """
    guide = get_or_create_guide_profile(request.user)
    bookings = guide.bookings.select_related(
        'traveler_user', 'traveler_user__traveler_profile', 'itinerary'
    ).all()
    update_outdated_booking_statuses(bookings)

    status_filter = request.query_params.get('status')
    if status_filter:
        bookings = bookings.filter(status=status_filter)

    serializer = BookingSerializer(
        bookings,
        many=True,
        context={'request': request, 'restrict_guide_communication': True},
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_booked_trips(request):
    """
    GET /api/guides/my-trips/
    Returns all bookings made by the logged-in traveler.
    """
    bookings = Booking.objects.select_related(
        'guide', 'guide__user', 'itinerary', 'review'
    ).filter(traveler_user=request.user).order_by('-created_at')
    update_outdated_booking_statuses(bookings)

    serializer = BookingSerializer(bookings, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_detail(request, pk):
    """
    GET /api/guides/me/bookings/<pk>/
    Returns full details for a single booking, including the nested itinerary.
    """
    guide = get_or_create_guide_profile(request.user)
    try:
        booking = guide.bookings.get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BookingSerializer(
        booking,
        context={'request': request, 'restrict_guide_communication': True},
    )
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_booking_status(request, pk):
    """
    PATCH /api/guides/me/bookings/<pk>/status/
    Update the status of a specific booking.
    """
    guide = get_or_create_guide_profile(request.user)
    try:
        booking = guide.bookings.get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in dict(Booking.STATUS_CHOICES):
        return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = new_status
    booking.save()

    if new_status == 'accepted':
        overlapping = Booking.objects.filter(
            guide=guide,
            status='pending',
            trip_start__lte=booking.trip_end,
            trip_end__gte=booking.trip_start
        ).exclude(pk=booking.pk)

        for overlapping_booking in overlapping:
            overlapping_booking.status = 'auto_rejected'
            overlapping_booking.notes = f"{overlapping_booking.notes}\n\n[System] Guide unavailable for selected dates."
            overlapping_booking.save(update_fields=['status', 'notes'])
            Activity.objects.create(
                guide=guide,
                activity_type='auto_rejected',
                message=f"Auto-rejected request from {overlapping_booking.traveler_name} due to date conflict.",
                highlight=f"To {overlapping_booking.destination}"
            )

    if new_status == 'accepted':
        Activity.objects.create(
            guide=guide,
            activity_type='accepted',
            message=f"Accepted request from {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )
    elif new_status == 'rejected':
        Activity.objects.create(
            guide=guide,
            activity_type='rejected',
            message=f"Declined request from {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )
    elif new_status == 'completed':
        Activity.objects.create(
            guide=guide,
            activity_type='completed',
            message=f"Completed trip with {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )

    update_outdated_booking_statuses([booking])
    serializer = BookingSerializer(
        booking,
        context={'request': request, 'restrict_guide_communication': True},
    )
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_review(request):
    """
    POST /api/guides/reviews/
    Create a verified review for a completed booking.
    """
    serializer = ReviewWriteSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    review = serializer.save()
    guide = review.guide

    Activity.objects.create(
        guide=guide,
        activity_type='rating',
        message=f"New {review.rating}-star review from {review.booking.traveler_name}",
        highlight=f"To {review.booking.destination}"
    )

    response_serializer = ReviewSummarySerializer(review, context={'request': request})
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def booking_chat(request, pk):
    """
    GET  /api/guides/bookings/<pk>/chat/ – fetch booking chat thread
    POST /api/guides/bookings/<pk>/chat/ – send a message into booking chat thread
    """
    try:
        booking = get_chat_booking_for_user(request.user, pk)
    except (ProgrammingError, OperationalError):
        return Response(
            {'error': 'Chat service is unavailable until the latest database migrations are applied.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if not booking:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    update_outdated_booking_statuses([booking])

    can_view_chat = booking.status in {'accepted', 'active', 'completed'}
    can_send_chat = booking.status in {'accepted', 'active'}
    if request.method == 'GET' and not can_view_chat:
        return Response(
            {'error': 'Chat available after acceptance.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == 'POST' and not can_send_chat:
        return Response(
            {'error': 'This chat is read-only for the current booking status.' if booking.status == 'completed' else 'Chat available after acceptance.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'POST':
        message = str(request.data.get('message', '')).strip()
        if not message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.guide.user_id == request.user.id:
            sender_role = 'guide'
        elif booking.traveler_user_id == request.user.id:
            sender_role = 'traveler'
        else:
            return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            chat_message = ChatMessage.objects.create(
                booking=booking,
                sender=request.user,
                sender_role=sender_role,
                message=message,
            )
        except (ProgrammingError, OperationalError):
            return Response(
                {'error': 'Chat service is unavailable until the latest database migrations are applied.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        serializer = ChatMessageSerializer(chat_message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    try:
        thread_payload = build_chat_thread_payload(booking, request)
    except (ProgrammingError, OperationalError):
        return Response(
            {'error': 'Chat service is unavailable until the latest database migrations are applied.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    serializer = ChatThreadSerializer(thread_payload, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_activity(request):
    """
    GET /api/guides/me/activity/
    Returns the recent activity feed for the logged-in guide.
    """
    guide = get_or_create_guide_profile(request.user)
    limit = int(request.query_params.get('limit', 20))
    activities = guide.activities.all()[:limit]

    serializer = ActivitySerializer(activities, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_dashboard(request):
    """
    GET /api/guides/me/dashboard/
    Returns aggregated stats for the analytics dashboard page.
    """
    guide = get_or_create_guide_profile(request.user)
    bookings = guide.bookings.all()
    total = bookings.count()

    counts = {item['status']: item['count'] for item in bookings.values('status').annotate(count=Count('status'))}

    active = counts.get('active', 0)
    pending = counts.get('pending', 0)
    upcoming = counts.get('upcoming', 0)
    completed = counts.get('completed', 0)
    completion_rate = round((completed / total * 100), 1) if total else 0

    dest_counts = {}
    for booking in bookings.values('destination'):
        destination = booking['destination'].split('&')[0].strip().split()[0]
        dest_counts[destination] = dest_counts.get(destination, 0) + 1

    top_destinations = [
        {'name': destination, 'count': count}
        for destination, count in sorted(dest_counts.items(), key=lambda item: -item[1])[:4]
    ]

    rating = GuideProfileSerializer(guide, context={'request': request}).data['rating']
    data = {
        'total_travelers': total,
        'active_trips': active,
        'pending_requests': pending,
        'upcoming_trips': upcoming,
        'completed_trips': completed,
        'completion_rate': completion_rate,
        'top_destinations': top_destinations,
        'rating': rating,
        'tours_completed': guide.tours_completed,
        'experience_years': guide.experience_years,
        'languages_count': len(guide.languages),
        'destinations_count': len(guide.destinations),
    }

    serializer = DashboardSerializer(data)
    return Response(serializer.data)
