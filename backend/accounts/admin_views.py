from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Q
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.authentication import AdminTokenAuthentication, build_admin_auth_token
from guides.models import Booking, GuideProfile
from itinerary.models import SavedItinerary


def _require_admin(request):
    user = getattr(request, "user", None)
    return bool(user and user.is_authenticated and user.is_superuser)


def _admin_forbidden():
    return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)


def _serialize_user(user):
    try:
        traveler_profile = user.traveler_profile
    except ObjectDoesNotExist:
        traveler_profile = None

    try:
        guide_profile = user.guide_profile
    except ObjectDoesNotExist:
        guide_profile = None
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": (
            (traveler_profile.full_name if traveler_profile and traveler_profile.full_name else "")
            or (guide_profile.full_name if guide_profile and guide_profile.full_name else "")
            or user.get_full_name()
            or user.username
        ),
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_guide": bool(guide_profile),
        "is_traveler": bool(traveler_profile),
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }


def _serialize_guide(guide):
    return {
        "id": guide.id,
        "user_id": guide.user_id,
        "full_name": guide.full_name or guide.user.get_full_name() or guide.user.username,
        "email": guide.email or guide.user.email,
        "phone": guide.phone,
        "availability": guide.availability,
        "experience_years": guide.experience_years,
        "rating": float(guide.rating or 0),
        "tours_completed": guide.tours_completed,
        "created_at": guide.created_at,
        "updated_at": guide.updated_at,
    }


def _serialize_booking(booking):
    return {
        "id": booking.id,
        "destination": booking.destination,
        "status": booking.status,
        "traveler_name": booking.traveler_name,
        "traveler_email": booking.traveler_email,
        "traveler_user_id": booking.traveler_user_id,
        "guide_id": booking.guide_id,
        "guide_user_id": booking.guide.user_id,
        "guide_name": booking.guide.full_name or booking.guide.user.get_full_name() or booking.guide.user.username,
        "trip_start": booking.trip_start,
        "trip_end": booking.trip_end,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
        "notes": booking.notes,
    }


def _serialize_itinerary(itinerary):
    return {
        "id": itinerary.id,
        "traveler_id": itinerary.traveler_id,
        "traveler_email": itinerary.traveler.email,
        "destination": itinerary.destination,
        "starting_place": itinerary.starting_place,
        "start_date": itinerary.start_date,
        "end_date": itinerary.end_date,
        "days": itinerary.days,
        "budget": itinerary.budget,
        "travelers": itinerary.travelers,
        "created_at": itinerary.created_at,
        "updated_at": itinerary.updated_at,
    }


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def admin_login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    user = authenticate(username=user_obj.username, password=password)
    if user is None:
        return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_superuser:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    token = build_admin_auth_token(user)
    return Response(
        {
            "message": "Admin login successful",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "is_superuser": user.is_superuser,
                "full_name": user.get_full_name() or user.username,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_check_auth(request):
    if not _require_admin(request):
        return _admin_forbidden()
    return Response(
        {
            "authenticated": True,
            "user": {
                "id": request.user.id,
                "email": request.user.email,
                "is_superuser": request.user.is_superuser,
                "full_name": request.user.get_full_name() or request.user.username,
            },
        }
    )


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    if not _require_admin(request):
        return _admin_forbidden()

    total_users = User.objects.count()
    total_guides = GuideProfile.objects.count()
    total_bookings = Booking.objects.count()
    active_bookings = Booking.objects.filter(status__in=["accepted", "active"]).count()
    completed_bookings = Booking.objects.filter(status="completed").count()
    total_itineraries = SavedItinerary.objects.count()

    recent_bookings = Booking.objects.select_related("guide", "guide__user").order_by("-created_at")[:5]
    booking_breakdown = Booking.objects.values("status").annotate(count=Count("id")).order_by("status")

    return Response(
        {
            "stats": {
                "total_users": total_users,
                "total_guides": total_guides,
                "total_bookings": total_bookings,
                "active_bookings": active_bookings,
                "completed_bookings": completed_bookings,
                "total_itineraries": total_itineraries,
            },
            "recent_bookings": [_serialize_booking(booking) for booking in recent_bookings],
            "booking_breakdown": list(booking_breakdown),
        }
    )


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    role = request.query_params.get("role", "").strip()
    ordering = request.query_params.get("ordering", "-date_joined")

    users = User.objects.select_related("traveler_profile", "guide_profile").all()
    if query:
        users = users.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(traveler_profile__full_name__icontains=query) |
            Q(guide_profile__full_name__icontains=query)
        )
    if role == "guide":
        users = users.filter(guide_profile__isnull=False)
    elif role == "traveler":
        users = users.filter(traveler_profile__isnull=False)
    elif role == "admin":
        users = users.filter(is_superuser=True)

    users = users.order_by(ordering)
    return Response([_serialize_user(user) for user in users[:200]])


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_guides(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    availability = request.query_params.get("availability", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    guides = GuideProfile.objects.select_related("user").all()
    if query:
        guides = guides.filter(
            Q(full_name__icontains=query) |
            Q(email__icontains=query) |
            Q(user__email__icontains=query) |
            Q(user__username__icontains=query)
        )
    if availability:
        guides = guides.filter(availability=availability)

    guides = guides.order_by(ordering)
    return Response([_serialize_guide(guide) for guide in guides[:200]])


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_bookings(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    status_value = request.query_params.get("status", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    bookings = Booking.objects.select_related("guide", "guide__user", "traveler_user").all()
    if query:
        bookings = bookings.filter(
            Q(destination__icontains=query) |
            Q(traveler_name__icontains=query) |
            Q(traveler_email__icontains=query) |
            Q(guide__full_name__icontains=query) |
            Q(guide__user__email__icontains=query)
        )
    if status_value:
        bookings = bookings.filter(status=status_value)

    bookings = bookings.order_by(ordering)
    return Response([_serialize_booking(booking) for booking in bookings[:200]])


@api_view(["PATCH"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_booking_status(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        booking = Booking.objects.select_related("guide", "guide__user").get(pk=pk)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    next_status = str(request.data.get("status", "")).strip()
    valid_statuses = {choice[0] for choice in Booking.STATUS_CHOICES}
    if next_status not in valid_statuses:
        return Response({"error": "Invalid booking status."}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = next_status
    booking.save(update_fields=["status", "updated_at"])
    return Response(_serialize_booking(booking))


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_itineraries(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    itineraries = SavedItinerary.objects.select_related("traveler").all()
    if query:
        itineraries = itineraries.filter(
            Q(destination__icontains=query) |
            Q(starting_place__icontains=query) |
            Q(traveler__email__icontains=query) |
            Q(traveler__username__icontains=query)
        )

    itineraries = itineraries.order_by(ordering)
    return Response([_serialize_itinerary(itinerary) for itinerary in itineraries[:200]])
