from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from .models import Trip, TravelerProfile
from .serializers import TripSerializer, RegisterSerializer, TravelerProfileSerializer
from .authentication import build_guide_auth_token
from guides.models import Booking
from guides.serializers import BookingSerializer

GOOGLE_CLIENT_ID = "320492427698-7se212gnd06b14a41a3jsca1sqiv4pn7.apps.googleusercontent.com"


# ======================
# REGISTER
# ======================
@csrf_exempt
@api_view(["POST"])
@authentication_classes([])          # ← bypass DRF CSRF check
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "User registered successfully"}, status=201)
    return Response(serializer.errors, status=400)


# ======================
# LOGIN
# ======================
@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")
    remember_me = request.data.get("remember_me", False)

    if not email or not password:
        return Response({"error": "Email and password required"}, status=400)

    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid email or password"}, status=401)

    user = authenticate(username=user_obj.username, password=password)
    if user is None:
        print(f"DEBUG LOGIN: authenticate failed for {email}")
        return Response({"error": "Invalid email or password"}, status=401)

    django_login(request, user)
    print(f"DEBUG LOGIN: django_login successful for {email}. Session key: {request.session.session_key}")
    request.session.set_expiry(60 * 60 * 24 * 14 if remember_me else 0)

    role = "guide" if hasattr(user, "guide_profile") else "traveler"
    return Response(
        {
            "message": "Login successful",
            "role": role,
            "email": user.email,
            "user": {"id": user.id, "email": user.email, "role": role},
        },
        status=200,
    )


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def guide_login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password required"}, status=400)

    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid email or password"}, status=401)

    user = authenticate(username=user_obj.username, password=password)
    if user is None:
        return Response({"error": "Invalid email or password"}, status=401)

    if not hasattr(user, "guide_profile"):
        return Response({"error": "This account belongs to a traveler. Please use the Traveler portal."}, status=403)

    token = build_guide_auth_token(user)
    return Response(
        {
            "message": "Guide login successful",
            "role": "guide",
            "token": token,
            "email": user.email,
            "user": {"id": user.id, "email": user.email, "role": "guide"},
        },
        status=200,
    )


# ======================
# GOOGLE LOGIN
# ======================
@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def google_login(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token missing"}, status=400)

    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        return Response({"error": "Invalid Google token"}, status=400)

    email = info.get("email")
    name = info.get("name", "")

    user, _ = User.objects.get_or_create(
        username=email,
        defaults={"email": email, "first_name": name}
    )

    django_login(request, user)
    role = "guide" if hasattr(user, "guide_profile") else "traveler"
    return Response(
        {
            "message": "Google login successful",
            "role": role,
            "email": user.email,
            "user": {"id": user.id, "email": user.email, "role": role},
        },
        status=200,
    )


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def guide_google_login(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token missing"}, status=400)

    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        return Response({"error": "Invalid Google token"}, status=400)

    email = info.get("email")
    if not email:
        return Response({"error": "Google account email missing"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "No guide account found for this Google user."}, status=404)

    if not hasattr(user, "guide_profile"):
        return Response({"error": "This account belongs to a traveler. Please use the Traveler portal."}, status=403)

    token_value = build_guide_auth_token(user)
    return Response(
        {
            "message": "Guide Google login successful",
            "role": "guide",
            "token": token_value,
            "email": user.email,
            "user": {"id": user.id, "email": user.email, "role": "guide"},
        },
        status=200,
    )


# ======================
# LOGOUT
# ======================
@api_view(["POST"])
def logout(request):
    django_logout(request)
    return Response({"message": "Logged out"}, status=200)


# ======================
# FORGOT PASSWORD
# ======================
token_generator = PasswordResetTokenGenerator()

@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email")

    if not email:
        return Response({"message": "If the email exists, a reset link was sent"})

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"message": "If the email exists, a reset link was sent"})

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)
    reset_link = f"http://localhost:3000/reset-password/{uid}/{token}"

    send_mail(
        "Reset Your Password",
        f"Reset your password: {reset_link}",
        None,
        [email],
        fail_silently=True,
    )

    return Response({"message": "Reset link sent"})


# ======================
# RESET PASSWORD
# ======================
@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def reset_password(request, uid, token):
    password = request.data.get("password")

    try:
        user_id = urlsafe_base64_decode(uid).decode()
        user = User.objects.get(pk=user_id)
    except Exception:
        return Response({"error": "Invalid reset link"}, status=400)

    if not token_generator.check_token(user, token):
        return Response({"error": "Invalid or expired token"}, status=400)

    user.set_password(password)
    user.save()
    return Response({"message": "Password reset successful"})


# ======================
# DASHBOARD
# ======================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    trips = Trip.objects.filter(user=request.user)
    return Response({
        "user": {
            "username": request.user.username,
            "email": request.user.email,
        },
        "trips": TripSerializer(trips, many=True).data
    })


# ======================
# CREATE TRIP
# ======================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_trip(request):
    serializer = TripSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ======================
# CHECK AUTH
# ======================
@ensure_csrf_cookie
@api_view(["GET"])
def check_auth(request):
    if request.user.is_authenticated:
        role = "guide" if hasattr(request.user, "guide_profile") else "traveler"
        return Response({
            "authenticated": True,
            "user": {
                "id": request.user.id,
                "email": request.user.email,
                "role": role,
            }
        })
    return Response({"authenticated": False})

# ======================
# CSRF COOKIE INIT
# ======================
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_cookie(request):
    return Response({"message": "CSRF cookie set"})

# ======================
# CHANGE PASSWORD
# ======================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get("old_password") or request.data.get("current_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    errors = {}

    if not old_password:
        errors["current_password"] = ["Current password is required."]
    if not new_password:
        errors["new_password"] = ["New password is required."]
    if confirm_password is None or confirm_password == "":
        errors["confirm_password"] = ["Please confirm your new password."]

    if errors:
        return Response({"errors": errors}, status=400)

    if not request.user.check_password(old_password):
        return Response({"errors": {"current_password": ["Current password is incorrect."]}}, status=400)

    if new_password != confirm_password:
        return Response({"errors": {"confirm_password": ["New passwords do not match."]}}, status=400)

    if len(new_password) < 8:
        return Response({"errors": {"new_password": ["New password must be at least 8 characters."]}}, status=400)

    try:
        validate_password(new_password, request.user)
    except ValidationError as exc:
        return Response({"errors": {"new_password": list(exc.messages)}}, status=400)

    request.user.set_password(new_password)
    request.user.save()
    # Re-authenticate so the session stays valid
    from django.contrib.auth import update_session_auth_hash
    update_session_auth_hash(request, request.user)
    return Response({"message": "Password changed successfully."})


# ======================
# TRAVELER PROFILE
# ======================
def get_or_create_traveler_profile(user):
    profile, _ = TravelerProfile.objects.get_or_create(
        user=user,
        defaults={
            'full_name': user.get_full_name() or user.username,
        },
    )
    return profile

@ensure_csrf_cookie
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def traveler_profile(request):
    """
    GET  /accounts/profile/me/
    PATCH /accounts/profile/me/
    """
    profile = get_or_create_traveler_profile(request.user)

    if request.method == 'GET':
        serializer = TravelerProfileSerializer(profile)
        return Response(serializer.data)

    # PATCH
    serializer = TravelerProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ======================
# TRAVELER BOOKINGS / REQUESTS
# ======================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_guide_requests(request):
    """
    GET /accounts/profile/requests/
    Returns all bookings (requests) made by the logged-in traveler.
    """
    bookings = Booking.objects.filter(traveler_user=request.user)
    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data)
