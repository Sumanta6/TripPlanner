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



