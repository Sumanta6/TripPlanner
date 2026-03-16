from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import GuideProfile, Booking, Activity
from .serializers import (
    GuideProfileSerializer,
    GuideProfileUpdateSerializer,
    BookingSerializer,
    ActivitySerializer,
    DashboardSerializer,
)


# ── Helper ────────────────────────────────────────────────────────────────────

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


# ── Public: Guide List & Detail ───────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def guide_list(request):
    """
    GET /api/guides/
    Returns a list of all registered guides (public).
    """
    guides = GuideProfile.objects.select_related('user').all()
    serializer = GuideProfileSerializer(guides, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_detail(request, pk):
    """
    GET /api/guides/<id>/
    Returns the public profile of a single guide.
    """
    try:
        guide = GuideProfile.objects.select_related('user').get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GuideProfileSerializer(guide)
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

    # Ensure data is mutable (dict instead of QueryDict if applicable)
    data = dict(request.data) if hasattr(request.data, 'dict') else request.data.copy()
    
    # Check if this booking should be linked to an itinerary
    from itinerary.models import SavedItinerary
    itinerary_id = data.get('itinerary_id')
    linked_itinerary = None
    if itinerary_id:
        try:
            linked_itinerary = SavedItinerary.objects.get(id=itinerary_id, traveler=request.user)
            # Auto-fill fields from the saved itinerary
            if not data.get('destination'):
                data['destination'] = linked_itinerary.destination
            if not data.get('trip_start') and linked_itinerary.start_date:
                data['trip_start'] = linked_itinerary.start_date
            if not data.get('trip_end') and linked_itinerary.end_date:
                data['trip_end'] = linked_itinerary.end_date
        except SavedItinerary.DoesNotExist:
            return Response({'error': 'Saved itinerary not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Manual validation
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

    # Note: `guide` and `itinerary` are read_only in the Serializer, so we pass them in `save()`
    # If the user has a traveler profile, safely grab details from it
    if hasattr(request.user, 'traveler_profile'):
        t_profile = request.user.traveler_profile
        data['traveler_name'] = data.get('traveler_name') or t_profile.full_name or request.user.username
        data['traveler_phone'] = data.get('traveler_phone') or t_profile.phone
    else:
        data['traveler_name'] = data.get('traveler_name') or request.user.username
    
    data['traveler_email'] = data.get('traveler_email') or request.user.email

    serializer = BookingSerializer(data=data)
    if serializer.is_valid():
        save_kwargs = {'guide': guide}
        if request.user.is_authenticated:
            save_kwargs['traveler_user'] = request.user
        if linked_itinerary:
            save_kwargs['itinerary'] = linked_itinerary
        
        booking = serializer.save(**save_kwargs)
        
        # Log activity for the guide
        Activity.objects.create(
            guide=guide,
            activity_type='request',
            message=f"New guide request from {booking.traveler_name}",
            highlight=f"To {booking.destination}",
            sub=f"{booking.trip_start} to {booking.trip_end}"
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# ── Authenticated: My Profile ─────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    GET  /api/guides/me/  – Return the logged-in guide's profile.
    PATCH /api/guides/me/ – Partially update profile fields.
    """
    guide = get_or_create_guide_profile(request.user)

    if request.method == 'GET':
        serializer = GuideProfileSerializer(guide)
        return Response(serializer.data)

    # PATCH
    serializer = GuideProfileUpdateSerializer(
        guide, data=request.data, partial=True
    )
    if serializer.is_valid():
        serializer.save()
        # Return the full profile after save
        return Response(GuideProfileSerializer(guide).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Authenticated: Bookings ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bookings(request):
    """
    GET /api/guides/me/bookings/
    Returns all bookings (travelers) assigned to the logged-in guide.
    Optional query param: ?status=active|upcoming|pending|completed
    """
    guide = get_or_create_guide_profile(request.user)
    bookings = guide.bookings.all()

    status_filter = request.query_params.get('status')
    if status_filter:
        bookings = bookings.filter(status=status_filter)

    serializer = BookingSerializer(bookings, many=True)
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

    serializer = BookingSerializer(booking)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_booking_status(request, pk):
    """
    PATCH /api/guides/me/bookings/<pk>/status/
    Update the status of a specific booking (e.g. pending -> active, rejected).
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
    
    # Log activity
    if new_status == 'active':
        Activity.objects.create(
            guide=guide,
            activity_type='accepted',
            message=f"Accepted request from {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )

    serializer = BookingSerializer(booking)
    return Response(serializer.data)


# ── Authenticated: Activity Feed ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_activity(request):
    """
    GET /api/guides/me/activity/
    Returns the recent activity feed for the logged-in guide.
    Optional query param: ?limit=<n> (default 20)
    """
    guide = get_or_create_guide_profile(request.user)
    limit = int(request.query_params.get('limit', 20))
    activities = guide.activities.all()[:limit]

    serializer = ActivitySerializer(activities, many=True)
    return Response(serializer.data)


# ── Authenticated: Dashboard Stats ────────────────────────────────────────────

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

    # Status counts
    counts = {item['status']: item['count'] for item in
              bookings.values('status').annotate(count=Count('status'))}

    active = counts.get('active', 0)
    pending = counts.get('pending', 0)
    upcoming = counts.get('upcoming', 0)
    completed = counts.get('completed', 0)

    completion_rate = round((completed / total * 100), 1) if total else 0

    # Top destinations (by booking frequency)
    dest_counts = {}
    for booking in bookings.values('destination'):
        dest = booking['destination'].split('&')[0].strip().split()[0]
        dest_counts[dest] = dest_counts.get(dest, 0) + 1

    top_destinations = [
        {'name': dest, 'count': count}
        for dest, count in sorted(dest_counts.items(), key=lambda x: -x[1])[:4]
    ]

    data = {
        'total_travelers': total,
        'active_trips': active,
        'pending_requests': pending,
        'upcoming_trips': upcoming,
        'completed_trips': completed,
        'completion_rate': completion_rate,
        'top_destinations': top_destinations,
        'rating': float(guide.rating),
        'tours_completed': guide.tours_completed,
        'experience_years': guide.experience_years,
        'languages_count': len(guide.languages),
        'destinations_count': len(guide.destinations),
    }

    serializer = DashboardSerializer(data)
    return Response(serializer.data)



