from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count, Q
from datetime import timedelta
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.authentication import AdminTokenAuthentication, build_admin_auth_token
from contacts.models import Contact
from guides.models import Booking, ChatMessage, GuideProfile, Review
from guides.serializers import build_status_reason_display
from itinerary.models import SavedItinerary


token_generator = PasswordResetTokenGenerator()


def _require_admin(request):
    user = getattr(request, "user", None)
    return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))


def _admin_forbidden():
    return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)


def _bad_request(message):
    return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)


def _paginate(queryset, request, serializer):
    try:
        page = max(int(request.query_params.get("page", 1) or 1), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(max(int(request.query_params.get("page_size", 12) or 12), 1), 100)
    except (TypeError, ValueError):
        page_size = 12
    paginator = Paginator(queryset, page_size)

    try:
        items = paginator.page(page)
    except EmptyPage:
        items = paginator.page(paginator.num_pages or 1)

    return Response(
        {
            "results": [serializer(item) for item in items.object_list],
            "pagination": {
                "page": items.number,
                "page_size": page_size,
                "total": paginator.count,
                "pages": paginator.num_pages,
                "has_next": items.has_next(),
                "has_previous": items.has_previous(),
            },
        }
    )


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        parts = [item.strip() for item in value.split(",")]
        return [item for item in parts if item]
    return list(value)


def _as_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return default


def _get_traveler_profile(user):
    try:
        return user.traveler_profile
    except ObjectDoesNotExist:
        return None


def _get_guide_profile(user):
    try:
        return user.guide_profile
    except ObjectDoesNotExist:
        return None


def _display_name(user):
    traveler_profile = _get_traveler_profile(user)
    if traveler_profile and traveler_profile.full_name:
        return traveler_profile.full_name

    guide_profile = _get_guide_profile(user)
    if guide_profile and guide_profile.full_name:
        return guide_profile.full_name

    return user.get_full_name() or user.username or user.email


def _serialize_user(user):
    traveler_profile = _get_traveler_profile(user)
    guide_profile = _get_guide_profile(user)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": _display_name(user),
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "role": "admin" if (user.is_superuser or user.is_staff) else "guide" if guide_profile else "traveler",
        "is_guide": bool(guide_profile),
        "is_traveler": bool(traveler_profile),
        "phone": (traveler_profile.phone if traveler_profile and traveler_profile.phone else "") or (guide_profile.phone if guide_profile and guide_profile.phone else ""),
        "address": traveler_profile.address if traveler_profile else "",
        "bio": traveler_profile.bio if traveler_profile else (guide_profile.bio if guide_profile else ""),
        "travel_style": traveler_profile.travel_style if traveler_profile else "",
        "preferred_destinations": traveler_profile.preferred_destinations if traveler_profile else [],
        "recent_interests": traveler_profile.recent_interests if traveler_profile else [],
        "guide_profile_id": guide_profile.id if guide_profile else None,
        "traveler_profile_id": traveler_profile.id if traveler_profile else None,
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
        "address": guide.address,
        "bio": guide.bio,
        "languages": guide.languages,
        "specialization": guide.specialization,
        "destinations": guide.destinations,
        "availability": guide.availability,
        "experience_years": float(guide.experience_years or 0),
        "rating": float(guide.rating or 0),
        "tours_completed": guide.tours_completed,
        "bookings_handled": guide.bookings.count(),
        "active_bookings": guide.bookings.filter(status__in=["accepted", "active"]).count(),
        "review_count": guide.reviews.count(),
        "user_active": guide.user.is_active,
        "created_at": guide.created_at,
        "updated_at": guide.updated_at,
    }


def _serialize_booking(booking):
    return {
        "id": booking.id,
        "destination": booking.destination,
        "status": booking.status,
        "status_reason_code": booking.status_reason_code,
        "status_reason_label": booking.get_status_reason_label(),
        "status_reason_note": booking.status_reason_note,
        "status_reason_display": build_status_reason_display(booking),
        "status_updated_by_role": booking.status_updated_by_role,
        "traveler_name": booking.traveler_name,
        "traveler_email": booking.traveler_email,
        "traveler_phone": booking.traveler_phone,
        "traveler_user_id": booking.traveler_user_id,
        "guide_id": booking.guide_id,
        "guide_user_id": booking.guide.user_id,
        "guide_name": booking.guide.full_name or booking.guide.user.get_full_name() or booking.guide.user.username,
        "trip_start": booking.trip_start,
        "trip_end": booking.trip_end,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
        "notes": booking.notes,
        "itinerary_id": booking.itinerary_id,
        "has_review": hasattr(booking, "review"),
        "chat_count": booking.chat_messages.count(),
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
        "notes": itinerary.notes,
        "itinerary_data": itinerary.itinerary_data,
        "booking_count": itinerary.bookings.count(),
        "created_at": itinerary.created_at,
        "updated_at": itinerary.updated_at,
    }


def _serialize_review(review):
    return {
        "id": review.id,
        "booking_id": review.booking_id,
        "guide_id": review.guide_id,
        "guide_name": review.guide.full_name or review.guide.user.get_full_name() or review.guide.user.username,
        "traveler_id": review.traveler_id,
        "traveler_name": _display_name(review.traveler),
        "traveler_email": review.traveler.email,
        "destination": review.booking.destination,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


def _serialize_contact(contact):
    return {
        "id": contact.id,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "subject": contact.subject,
        "message": contact.message,
        "status": contact.status,
        "created_at": contact.created_at,
    }


def _serialize_chat_message(message):
    return {
        "id": message.id,
        "booking_id": message.booking_id,
        "destination": message.booking.destination,
        "sender_id": message.sender_id,
        "sender_name": _display_name(message.sender),
        "sender_role": message.sender_role,
        "receiver_id": message.receiver_id,
        "message": message.message,
        "created_at": message.created_at,
    }


def _serialize_chat_thread(booking):
    latest = booking.chat_messages.order_by("-created_at").first()
    return {
        "booking_id": booking.id,
        "destination": booking.destination,
        "status": booking.status,
        "traveler_name": booking.traveler_name,
        "guide_name": booking.guide.full_name or booking.guide.user.get_full_name() or booking.guide.user.username,
        "trip_start": booking.trip_start,
        "trip_end": booking.trip_end,
        "message_count": booking.chat_messages.count(),
        "last_message": latest.message if latest else "",
        "last_message_at": latest.created_at if latest else None,
    }


def _build_daily_series(days, label_builder, querysets):
    today = timezone.now().date()
    timeline = []
    buckets = {}
    for offset in range(days - 1, -1, -1):
        point_date = today - timedelta(days=offset)
        key = point_date.isoformat()
        buckets[key] = {"date": key, "label": label_builder(point_date)}
        for series_name in querysets:
            buckets[key][series_name] = 0
        timeline.append(buckets[key])

    for series_name, queryset in querysets.items():
        for item in queryset:
            point = item["day"]
            if not point:
                continue
            key = point.isoformat()
            if key in buckets:
                buckets[key][series_name] = item["count"]

    return timeline


def _apply_created_at_filters(queryset, request, field_name="created_at"):
    date_from = request.query_params.get("date_from", "").strip()
    date_to = request.query_params.get("date_to", "").strip()

    if date_from:
        parsed = parse_date(date_from)
        if parsed:
            queryset = queryset.filter(**{f"{field_name}__date__gte": parsed})
    if date_to:
        parsed = parse_date(date_to)
        if parsed:
            queryset = queryset.filter(**{f"{field_name}__date__lte": parsed})
    return queryset


def _apply_trip_date_filters(queryset, request):
    trip_start_from = request.query_params.get("trip_start_from", "").strip()
    trip_end_to = request.query_params.get("trip_end_to", "").strip()

    if trip_start_from:
        parsed = parse_date(trip_start_from)
        if parsed:
            queryset = queryset.filter(trip_start__gte=parsed)
    if trip_end_to:
        parsed = parse_date(trip_end_to)
        if parsed:
            queryset = queryset.filter(trip_end__lte=parsed)
    return queryset


def _ensure_traveler_profile(user):
    profile = _get_traveler_profile(user)
    if profile:
        return profile
    return user.traveler_profile.__class__.objects.create(user=user)


def _create_traveler_profile(user, payload):
    profile = _get_traveler_profile(user)
    if profile:
        return profile
    from accounts.models import TravelerProfile

    return TravelerProfile.objects.create(
        user=user,
        full_name=payload.get("full_name", "") or user.get_full_name() or user.username,
        phone=payload.get("phone", ""),
        address=payload.get("address", ""),
        bio=payload.get("bio", ""),
        preferred_destinations=_as_list(payload.get("preferred_destinations")),
        travel_style=payload.get("travel_style", ""),
        recent_interests=_as_list(payload.get("recent_interests")),
    )


def _create_guide_profile(user, payload):
    profile = _get_guide_profile(user)
    if profile:
        return profile
    return GuideProfile.objects.create(
        user=user,
        full_name=payload.get("full_name", "") or user.get_full_name() or user.username,
        email=payload.get("email") or user.email,
        phone=payload.get("phone", ""),
        address=payload.get("address", ""),
        bio=payload.get("bio", ""),
        languages=_as_list(payload.get("languages")),
        specialization=payload.get("specialization", ""),
        destinations=_as_list(payload.get("destinations")),
        experience_years=payload.get("experience_years") or 0,
        availability=payload.get("availability") or "available",
    )


def _apply_user_payload(user, payload):
    if "email" in payload:
        user.email = payload.get("email", "").strip()
    if "username" in payload:
        user.username = payload.get("username", "").strip() or user.email
    if "first_name" in payload:
        user.first_name = payload.get("first_name", "").strip()
    if "last_name" in payload:
        user.last_name = payload.get("last_name", "").strip()
    if "is_active" in payload:
        user.is_active = _as_bool(payload.get("is_active"), user.is_active)
    if "is_staff" in payload:
        user.is_staff = _as_bool(payload.get("is_staff"), user.is_staff)
    if "is_superuser" in payload:
        user.is_superuser = _as_bool(payload.get("is_superuser"), user.is_superuser)
    if payload.get("password"):
        user.set_password(payload.get("password"))
    user.save()

    traveler_profile = _get_traveler_profile(user)
    guide_profile = _get_guide_profile(user)

    if payload.get("role") == "traveler" and not traveler_profile:
        traveler_profile = _create_traveler_profile(user, payload)
    if payload.get("role") == "guide" and not guide_profile:
        guide_profile = _create_guide_profile(user, payload)

    if traveler_profile:
        if "full_name" in payload:
            traveler_profile.full_name = payload.get("full_name", "")
        if "phone" in payload:
            traveler_profile.phone = payload.get("phone", "")
        if "address" in payload:
            traveler_profile.address = payload.get("address", "")
        if "bio" in payload:
            traveler_profile.bio = payload.get("bio", "")
        if "travel_style" in payload:
            traveler_profile.travel_style = payload.get("travel_style", "")
        if "preferred_destinations" in payload:
            traveler_profile.preferred_destinations = _as_list(payload.get("preferred_destinations"))
        if "recent_interests" in payload:
            traveler_profile.recent_interests = _as_list(payload.get("recent_interests"))
        traveler_profile.save()

    if guide_profile:
        if "full_name" in payload:
            guide_profile.full_name = payload.get("full_name", "")
        if "phone" in payload:
            guide_profile.phone = payload.get("phone", "")
        if "address" in payload:
            guide_profile.address = payload.get("address", "")
        if "bio" in payload:
            guide_profile.bio = payload.get("bio", "")
        if "languages" in payload:
            guide_profile.languages = _as_list(payload.get("languages"))
        if "specialization" in payload:
            guide_profile.specialization = payload.get("specialization", "")
        if "destinations" in payload:
            guide_profile.destinations = _as_list(payload.get("destinations"))
        if "experience_years" in payload:
            guide_profile.experience_years = payload.get("experience_years") or 0
        if "availability" in payload:
            guide_profile.availability = payload.get("availability") or guide_profile.availability
        if "email" in payload:
            guide_profile.email = payload.get("email", "") or user.email
        guide_profile.save()

    return user


def _create_user_from_payload(payload):
    email = str(payload.get("email", "")).strip()
    if not email:
        raise ValueError("Email is required.")
    if User.objects.filter(email=email).exists():
        raise ValueError("A user with this email already exists.")

    username = str(payload.get("username", "")).strip() or email
    if User.objects.filter(username=username).exists():
        raise ValueError("A user with this username already exists.")

    user = User(
        username=username,
        email=email,
        first_name=str(payload.get("first_name", "")).strip(),
        last_name=str(payload.get("last_name", "")).strip(),
        is_active=_as_bool(payload.get("is_active"), True),
        is_staff=_as_bool(payload.get("is_staff"), False),
        is_superuser=_as_bool(payload.get("is_superuser"), False),
    )
    password = payload.get("password")
    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()
    user.save()

    role = payload.get("role")
    if role == "guide":
        _create_guide_profile(user, payload)
    elif role == "traveler":
        _create_traveler_profile(user, payload)
    elif role == "admin":
        user.is_staff = True
        user.save(update_fields=["is_staff"])

    return user


def _apply_guide_payload(guide, payload):
    if "full_name" in payload:
        guide.full_name = payload.get("full_name", "")
    if "email" in payload:
        guide.email = payload.get("email", "")
        guide.user.email = guide.email
        guide.user.save(update_fields=["email"])
    if "phone" in payload:
        guide.phone = payload.get("phone", "")
    if "address" in payload:
        guide.address = payload.get("address", "")
    if "bio" in payload:
        guide.bio = payload.get("bio", "")
    if "languages" in payload:
        guide.languages = _as_list(payload.get("languages"))
    if "specialization" in payload:
        guide.specialization = payload.get("specialization", "")
    if "destinations" in payload:
        guide.destinations = _as_list(payload.get("destinations"))
    if "experience_years" in payload:
        guide.experience_years = payload.get("experience_years") or 0
    if "availability" in payload:
        guide.availability = payload.get("availability") or guide.availability
    guide.save()

    if "user_active" in payload:
        guide.user.is_active = _as_bool(payload.get("user_active"), guide.user.is_active)
        guide.user.save(update_fields=["is_active"])

    return guide


def _create_guide_from_payload(payload):
    user_id = payload.get("user_id")
    if user_id:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValueError("User not found.")
        if _get_guide_profile(user):
            raise ValueError("This user already has a guide profile.")
    else:
        user = _create_user_from_payload(
            {
                **payload,
                "role": "guide",
                "username": payload.get("username") or payload.get("email"),
            }
        )
    return _create_guide_profile(user, payload)


def _apply_booking_payload(booking, payload):
    if "guide_id" in payload:
        try:
            booking.guide = GuideProfile.objects.get(pk=payload.get("guide_id"))
        except GuideProfile.DoesNotExist:
            raise ValueError("Guide not found.")

    traveler_user_id = payload.get("traveler_user_id")
    if traveler_user_id:
        try:
            booking.traveler_user = User.objects.get(pk=traveler_user_id)
        except User.DoesNotExist:
            raise ValueError("Traveler user not found.")

    if "itinerary_id" in payload:
        itinerary_id = payload.get("itinerary_id")
        if itinerary_id:
            try:
                booking.itinerary = SavedItinerary.objects.get(pk=itinerary_id)
            except SavedItinerary.DoesNotExist:
                raise ValueError("Itinerary not found.")
        else:
            booking.itinerary = None

    for field in ["traveler_name", "traveler_email", "traveler_phone", "destination", "status", "notes"]:
        if field in payload:
            setattr(booking, field, payload.get(field) or "")

    if "trip_start" in payload:
        booking.trip_start = parse_date(str(payload.get("trip_start"))) or booking.trip_start
    if "trip_end" in payload:
        booking.trip_end = parse_date(str(payload.get("trip_end"))) or booking.trip_end

    booking.save()
    return booking


def _create_booking_from_payload(payload):
    try:
        guide = GuideProfile.objects.get(pk=payload.get("guide_id"))
    except GuideProfile.DoesNotExist:
        raise ValueError("Guide not found.")

    booking = Booking(
        guide=guide,
        traveler_name=payload.get("traveler_name", ""),
        traveler_email=payload.get("traveler_email", ""),
        traveler_phone=payload.get("traveler_phone", ""),
        destination=payload.get("destination", ""),
        trip_start=parse_date(str(payload.get("trip_start"))),
        trip_end=parse_date(str(payload.get("trip_end"))),
        status=payload.get("status") or "pending",
        notes=payload.get("notes", ""),
    )

    traveler_user_id = payload.get("traveler_user_id")
    if traveler_user_id:
        try:
            booking.traveler_user = User.objects.get(pk=traveler_user_id)
        except User.DoesNotExist:
            raise ValueError("Traveler user not found.")

    itinerary_id = payload.get("itinerary_id")
    if itinerary_id:
        try:
            booking.itinerary = SavedItinerary.objects.get(pk=itinerary_id)
        except SavedItinerary.DoesNotExist:
            raise ValueError("Itinerary not found.")

    if not booking.trip_start or not booking.trip_end:
        raise ValueError("Trip start and end dates are required.")

    booking.save()
    return booking


def _apply_itinerary_payload(itinerary, payload):
    if "traveler_id" in payload:
        try:
            itinerary.traveler = User.objects.get(pk=payload.get("traveler_id"))
        except User.DoesNotExist:
            raise ValueError("Traveler not found.")

    for field in ["destination", "starting_place", "notes"]:
        if field in payload:
            setattr(itinerary, field, payload.get(field) or "")

    if "start_date" in payload:
        itinerary.start_date = parse_date(str(payload.get("start_date"))) if payload.get("start_date") else None
    if "end_date" in payload:
        itinerary.end_date = parse_date(str(payload.get("end_date"))) if payload.get("end_date") else None
    if "days" in payload:
        itinerary.days = int(payload.get("days") or 1)
    if "budget" in payload:
        itinerary.budget = payload.get("budget") or None
    if "travelers" in payload:
        itinerary.travelers = int(payload.get("travelers") or 1)
    if "itinerary_data" in payload:
        itinerary.itinerary_data = payload.get("itinerary_data") or {}

    itinerary.save()
    return itinerary


def _create_itinerary_from_payload(payload):
    try:
        traveler = User.objects.get(pk=payload.get("traveler_id"))
    except User.DoesNotExist:
        raise ValueError("Traveler not found.")

    start_date = parse_date(str(payload.get("start_date"))) if payload.get("start_date") else None
    end_date = parse_date(str(payload.get("end_date"))) if payload.get("end_date") else None
    return SavedItinerary.objects.create(
        traveler=traveler,
        destination=payload.get("destination", ""),
        starting_place=payload.get("starting_place", ""),
        start_date=start_date,
        end_date=end_date,
        days=int(payload.get("days") or 1),
        budget=payload.get("budget") or None,
        travelers=int(payload.get("travelers") or 1),
        notes=payload.get("notes", ""),
        itinerary_data=payload.get("itinerary_data") or {},
    )


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

    if not (user.is_superuser or user.is_staff):
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
                "is_staff": user.is_staff,
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
                "is_staff": request.user.is_staff,
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

    today = timezone.now().date()
    recent_bookings = Booking.objects.select_related("guide", "guide__user").order_by("-created_at")[:6]
    recent_signups = User.objects.order_by("-date_joined")[:6]
    recent_reviews = Review.objects.select_related("guide", "guide__user", "traveler", "booking").order_by("-created_at")[:5]
    booking_breakdown = list(Booking.objects.values("status").annotate(count=Count("id")).order_by("status"))
    review_breakdown = list(Review.objects.values("rating").annotate(count=Count("id")).order_by("-rating"))
    top_destinations = list(
        SavedItinerary.objects.values("destination")
        .annotate(count=Count("id"))
        .exclude(destination="")
        .order_by("-count", "destination")[:6]
    )

    user_growth = (
        User.objects.filter(date_joined__date__gte=today - timedelta(days=29))
        .extra(select={"day": "date(date_joined)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    guide_growth = (
        GuideProfile.objects.filter(created_at__date__gte=today - timedelta(days=29))
        .extra(select={"day": "date(created_at)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    booking_trend = (
        Booking.objects.filter(created_at__date__gte=today - timedelta(days=29))
        .extra(select={"day": "date(created_at)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    contact_trend = (
        Contact.objects.filter(created_at__date__gte=today - timedelta(days=29))
        .extra(select={"day": "date(created_at)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    chat_trend = (
        ChatMessage.objects.filter(created_at__date__gte=today - timedelta(days=29))
        .extra(select={"day": "date(created_at)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    activity_timeline = _build_daily_series(
        30,
        lambda point_date: point_date.strftime("%b %d"),
        {
            "bookings": booking_trend,
            "contacts": contact_trend,
            "chats": chat_trend,
        },
    )
    growth_timeline = _build_daily_series(
        30,
        lambda point_date: point_date.strftime("%b %d"),
        {
            "users": user_growth,
            "guides": guide_growth,
        },
    )

    booking_status_map = {row["status"]: row["count"] for row in booking_breakdown}
    total_bookings = Booking.objects.count()
    active_count = booking_status_map.get("accepted", 0) + booking_status_map.get("active", 0)
    completed_count = booking_status_map.get("completed", 0)
    cancelled_count = booking_status_map.get("cancelled", 0) + booking_status_map.get("rejected", 0) + booking_status_map.get("auto_rejected", 0)

    return Response(
        {
            "stats": {
                "total_users": User.objects.count(),
                "total_guides": GuideProfile.objects.count(),
                "total_bookings": Booking.objects.count(),
                "active_bookings": Booking.objects.filter(status__in=["accepted", "active"]).count(),
                "completed_bookings": Booking.objects.filter(status="completed").count(),
                "cancelled_bookings": Booking.objects.filter(status="cancelled").count(),
                "total_itineraries": SavedItinerary.objects.count(),
                "total_reviews": Review.objects.count(),
                "total_contacts": Contact.objects.count(),
            },
            "booking_breakdown": booking_breakdown,
            "analytics": {
                "booking_status_chart": booking_breakdown,
                "booking_trend": activity_timeline,
                "growth_trend": growth_timeline,
                "top_destinations": top_destinations,
                "review_distribution": review_breakdown,
                "activity_volume": activity_timeline,
                "platform_health": {
                    "active": active_count,
                    "completed": completed_count,
                    "cancelled": cancelled_count,
                    "total": total_bookings,
                },
            },
            "recent_signups": [_serialize_user(user) for user in recent_signups],
            "recent_booking_activity": [_serialize_booking(booking) for booking in recent_bookings],
            "recent_reviews": [_serialize_review(review) for review in recent_reviews],
            "health": {
                "pending_bookings": Booking.objects.filter(status="pending").count(),
                "upcoming_active_trips": Booking.objects.filter(status__in=["accepted", "active"], trip_end__gte=today).count(),
                "new_contacts": Contact.objects.filter(status="New").count(),
                "unanswered_reviews": Review.objects.filter(comment="").count(),
                "chat_threads": Booking.objects.filter(chat_messages__isnull=False).distinct().count(),
            },
        }
    )


@api_view(["GET", "POST"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not _require_admin(request):
        return _admin_forbidden()

    if request.method == "POST":
        try:
            user = _create_user_from_payload(request.data)
        except ValueError as exc:
            return _bad_request(str(exc))
        return Response(_serialize_user(user), status=status.HTTP_201_CREATED)

    query = request.query_params.get("q", "").strip()
    role = request.query_params.get("role", "").strip()
    ordering = request.query_params.get("ordering", "-date_joined")

    users = User.objects.select_related("traveler_profile", "guide_profile").all()
    if query:
        users = users.filter(
            Q(username__icontains=query)
            | Q(email__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(traveler_profile__full_name__icontains=query)
            | Q(guide_profile__full_name__icontains=query)
        )
    if role == "guide":
        users = users.filter(guide_profile__isnull=False)
    elif role == "traveler":
        users = users.filter(traveler_profile__isnull=False)
    elif role == "admin":
        users = users.filter(Q(is_superuser=True) | Q(is_staff=True))

    users = _apply_created_at_filters(users, request, "date_joined")
    users = users.order_by(ordering)
    return _paginate(users, request, _serialize_user)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        user = User.objects.select_related("traveler_profile", "guide_profile").get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_user(user))

    if request.method == "DELETE":
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    try:
        user = _apply_user_payload(user, request.data)
    except ValueError as exc:
        return _bad_request(str(exc))
    return Response(_serialize_user(user))


@api_view(["POST"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_user_reset_password(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)
    reset_link = f"http://localhost:3000/reset-password/{uid}/{token}"
    send_mail(
        "TripPlanner Password Reset",
        f"Reset your TripPlanner password: {reset_link}",
        None,
        [user.email],
        fail_silently=True,
    )
    return Response({"message": "Password reset email triggered.", "reset_link": reset_link})


@api_view(["GET", "POST"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_guides(request):
    if not _require_admin(request):
        return _admin_forbidden()

    if request.method == "POST":
        try:
            guide = _create_guide_from_payload(request.data)
        except ValueError as exc:
            return _bad_request(str(exc))
        return Response(_serialize_guide(guide), status=status.HTTP_201_CREATED)

    query = request.query_params.get("q", "").strip()
    availability = request.query_params.get("availability", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    guides = GuideProfile.objects.select_related("user").all()
    if query:
        guides = guides.filter(
            Q(full_name__icontains=query)
            | Q(email__icontains=query)
            | Q(user__email__icontains=query)
            | Q(user__username__icontains=query)
        )
    if availability:
        guides = guides.filter(availability=availability)

    guides = _apply_created_at_filters(guides, request)
    guides = guides.order_by(ordering)
    return _paginate(guides, request, _serialize_guide)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_guide_detail(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        guide = GuideProfile.objects.select_related("user").get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({"error": "Guide not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_guide(guide))
    if request.method == "DELETE":
        guide.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    guide = _apply_guide_payload(guide, request.data)
    return Response(_serialize_guide(guide))


@api_view(["GET", "POST"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_bookings(request):
    if not _require_admin(request):
        return _admin_forbidden()

    if request.method == "POST":
        try:
            booking = _create_booking_from_payload(request.data)
        except ValueError as exc:
            return _bad_request(str(exc))
        return Response(_serialize_booking(booking), status=status.HTTP_201_CREATED)

    query = request.query_params.get("q", "").strip()
    status_value = request.query_params.get("status", "").strip()
    guide_id = request.query_params.get("guide_id", "").strip()
    traveler_id = request.query_params.get("traveler_id", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    bookings = Booking.objects.select_related("guide", "guide__user", "traveler_user", "itinerary").prefetch_related("chat_messages")
    if query:
        bookings = bookings.filter(
            Q(destination__icontains=query)
            | Q(traveler_name__icontains=query)
            | Q(traveler_email__icontains=query)
            | Q(guide__full_name__icontains=query)
            | Q(guide__user__email__icontains=query)
        )
    if status_value:
        bookings = bookings.filter(status=status_value)
    if guide_id:
        bookings = bookings.filter(guide_id=guide_id)
    if traveler_id:
        bookings = bookings.filter(traveler_user_id=traveler_id)

    bookings = _apply_created_at_filters(bookings, request)
    bookings = _apply_trip_date_filters(bookings, request)
    bookings = bookings.order_by(ordering)
    return _paginate(bookings, request, _serialize_booking)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_booking_detail(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        booking = Booking.objects.select_related("guide", "guide__user", "traveler_user", "itinerary").prefetch_related("chat_messages").get(pk=pk)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_booking(booking))
    if request.method == "DELETE":
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    try:
        booking = _apply_booking_payload(booking, request.data)
    except ValueError as exc:
        return _bad_request(str(exc))
    return Response(_serialize_booking(booking))


@api_view(["PATCH"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_booking_status(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        booking = Booking.objects.select_related("guide", "guide__user").prefetch_related("chat_messages").get(pk=pk)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    next_status = str(request.data.get("status", "")).strip()
    valid_statuses = {choice[0] for choice in Booking.STATUS_CHOICES}
    if next_status not in valid_statuses:
        return Response({"error": "Invalid booking status."}, status=status.HTTP_400_BAD_REQUEST)

    reason_code = str(request.data.get("reason_code", "") or "").strip()
    reason_note = str(request.data.get("reason_note", "") or "").strip()
    valid_reason_codes = {choice[0] for choice in Booking.STATUS_REASON_CHOICES}
    if reason_code and reason_code not in valid_reason_codes:
        return Response({"error": "Invalid status reason."}, status=status.HTTP_400_BAD_REQUEST)
    if reason_code == "other" and not reason_note:
        return Response({"error": "Please provide a custom reason when selecting Other."}, status=status.HTTP_400_BAD_REQUEST)
    if not reason_code and reason_note:
        return Response({"error": "A reason option must be selected before adding notes."}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = next_status
    booking.status_reason_code = reason_code
    booking.status_reason_note = reason_note
    booking.status_updated_by_role = "admin" if reason_code or reason_note or next_status in {"rejected", "cancelled"} else ""
    booking.save(update_fields=["status", "status_reason_code", "status_reason_note", "status_updated_by_role", "updated_at"])
    return Response(_serialize_booking(booking))


@api_view(["GET", "POST"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_itineraries(request):
    if not _require_admin(request):
        return _admin_forbidden()

    if request.method == "POST":
        try:
            itinerary = _create_itinerary_from_payload(request.data)
        except ValueError as exc:
            return _bad_request(str(exc))
        return Response(_serialize_itinerary(itinerary), status=status.HTTP_201_CREATED)

    query = request.query_params.get("q", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    itineraries = SavedItinerary.objects.select_related("traveler").prefetch_related("bookings").all()
    if query:
        itineraries = itineraries.filter(
            Q(destination__icontains=query)
            | Q(starting_place__icontains=query)
            | Q(traveler__email__icontains=query)
            | Q(traveler__username__icontains=query)
        )

    itineraries = _apply_created_at_filters(itineraries, request)
    itineraries = itineraries.order_by(ordering)
    return _paginate(itineraries, request, _serialize_itinerary)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_itinerary_detail(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        itinerary = SavedItinerary.objects.select_related("traveler").prefetch_related("bookings").get(pk=pk)
    except SavedItinerary.DoesNotExist:
        return Response({"error": "Itinerary not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_itinerary(itinerary))
    if request.method == "DELETE":
        itinerary.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    try:
        itinerary = _apply_itinerary_payload(itinerary, request.data)
    except ValueError as exc:
        return _bad_request(str(exc))
    return Response(_serialize_itinerary(itinerary))


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_reviews(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    rating = request.query_params.get("rating", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    reviews = Review.objects.select_related("guide", "guide__user", "traveler", "booking").all()
    if query:
        reviews = reviews.filter(
            Q(comment__icontains=query)
            | Q(guide__full_name__icontains=query)
            | Q(traveler__email__icontains=query)
            | Q(booking__destination__icontains=query)
        )
    if rating:
        reviews = reviews.filter(rating=rating)

    reviews = _apply_created_at_filters(reviews, request)
    reviews = reviews.order_by(ordering)
    return _paginate(reviews, request, _serialize_review)


@api_view(["GET", "DELETE"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_review_detail(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        review = Review.objects.select_related("guide", "guide__user", "traveler", "booking").get(pk=pk)
    except Review.DoesNotExist:
        return Response({"error": "Review not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_review(review))

    review.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_contacts(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    status_value = request.query_params.get("status", "").strip()
    ordering = request.query_params.get("ordering", "-created_at")

    contacts = Contact.objects.all()
    if query:
        contacts = contacts.filter(
            Q(name__icontains=query)
            | Q(email__icontains=query)
            | Q(subject__icontains=query)
            | Q(message__icontains=query)
        )
    if status_value:
        contacts = contacts.filter(status=status_value)
    contacts = _apply_created_at_filters(contacts, request)
    contacts = contacts.order_by(ordering)
    return _paginate(contacts, request, _serialize_contact)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_contact_detail(request, pk):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        contact = Contact.objects.get(pk=pk)
    except Contact.DoesNotExist:
        return Response({"error": "Contact not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_contact(contact))
    if request.method == "DELETE":
        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if "status" in request.data:
        contact.status = request.data.get("status") or contact.status
    contact.save(update_fields=["status"])
    return Response(_serialize_contact(contact))


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_chat_threads(request):
    if not _require_admin(request):
        return _admin_forbidden()

    query = request.query_params.get("q", "").strip()
    status_value = request.query_params.get("status", "").strip()
    ordering = request.query_params.get("ordering", "-updated_at")

    bookings = Booking.objects.select_related("guide", "guide__user").prefetch_related("chat_messages").filter(chat_messages__isnull=False).distinct()
    if query:
        bookings = bookings.filter(
            Q(destination__icontains=query)
            | Q(traveler_name__icontains=query)
            | Q(guide__full_name__icontains=query)
        )
    if status_value:
        bookings = bookings.filter(status=status_value)
    bookings = _apply_created_at_filters(bookings, request)
    bookings = _apply_trip_date_filters(bookings, request)
    bookings = bookings.order_by(ordering)
    return _paginate(bookings, request, _serialize_chat_thread)


@api_view(["GET"])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAuthenticated])
def admin_chat_thread_detail(request, booking_id):
    if not _require_admin(request):
        return _admin_forbidden()

    try:
        booking = Booking.objects.select_related("guide", "guide__user").get(pk=booking_id)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    messages = (
        ChatMessage.objects.select_related("sender", "booking")
        .filter(booking_id=booking_id)
        .order_by("created_at")
    )
    return Response(
        {
            "thread": _serialize_chat_thread(booking),
            "messages": [_serialize_chat_message(message) for message in messages],
        }
    )
