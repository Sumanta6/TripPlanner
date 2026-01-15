from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from google.oauth2 import id_token
from google.auth.transport import requests

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated


from .models import Trip
from .serializers import TripSerializer, RegisterSerializer


# ======================
# REGISTER
# ======================
@api_view(["POST"])
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
        return Response({"error": "Invalid email or password"}, status=401)

    django_login(request, user)

    request.session.set_expiry(
        60 * 60 * 24 * 14 if remember_me else 0
    )

    return Response({"message": "Login successful"}, status=200)


# ======================
# GOOGLE LOGIN
# ======================
@csrf_exempt
@api_view(["POST"])
def google_login(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token missing"}, status=400)

    try:
        info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            "849889490000-4r9i22c5m8d0nbf24sosgd37t82h4a4b.apps.googleusercontent.com"
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
    return Response({"message": "Google login successful"}, status=200)


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

@api_view(["POST"])
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
@api_view(["POST"])
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
@api_view(["GET"])
def check_auth(request):
    if request.user.is_authenticated:
        return Response({
            "authenticated": True,
            "user": {
                "email": request.user.email
            }
        })
    return Response({"authenticated": False})
