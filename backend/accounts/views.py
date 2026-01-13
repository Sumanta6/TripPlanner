import json
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from google.oauth2 import id_token
from google.auth.transport import requests
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail


from .serializers import RegisterSerializer


# ======================
# REGISTER
# ======================
@api_view(["POST"])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {"message": "User registered successfully"},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ======================
# LOGIN (EMAIL OR USERNAME)
# ======================
@api_view(["POST"])
def login(request):
    identifier = request.data.get("email")
    password = request.data.get("password")

    if not identifier or not password:
        return Response(
            {"error": "Email/username and password required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Try username
    user = authenticate(username=identifier, password=password)

    # Try email
    if user is None:
        try:
            user_obj = User.objects.get(email=identifier)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    if user is not None:
        django_login(request, user)
        return Response(
            {
                "message": "Login successful",
                "user": {
                    "username": user.username,
                    "email": user.email,
                }
            },
            status=status.HTTP_200_OK
        )

    return Response(
        {"error": "Invalid credentials"},
        status=status.HTTP_401_UNAUTHORIZED
    )


# ======================
# GOOGLE LOGIN (SESSION AUTH)
# ======================
@api_view(["POST"])
def google_login(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Token missing"}, status=400)

        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            "849889490000-7p61vijavismlhjbsmjscdchtdkesf1o.apps.googleusercontent.com"
        )

        email = idinfo.get("email")
        name = idinfo.get("name", "")

        if not email:
            return Response({"error": "Email not provided by Google"}, status=400)

        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": name,
            }
        )

        django_login(request, user)

        return Response(
            {
                "message": "Google login successful",
                "user": {
                    "email": user.email,
                    "name": user.first_name,
                }
            },
            status=status.HTTP_200_OK
        )

    except ValueError:
        return Response({"error": "Invalid Google token"}, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================
# LOGOUT
# ======================
@api_view(["POST"])
def logout(request):
    django_logout(request)
    return Response(
        {"message": "Logged out successfully"},
        status=status.HTTP_200_OK
    )
token_generator = PasswordResetTokenGenerator()

# ======================
# FORGOT PASSWORD
# ======================
@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email")

    # Always return success message (security + stability)
    success_response = Response(
        {"message": "If the email exists, a reset link has been sent"},
        status=200,
    )

    if not email:
        return success_response

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return success_response

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)
    reset_link = f"http://localhost:3000/reset-password/{uid}/{token}"


    # 🔐 EMAIL MUST NEVER BREAK THE API
    try:
        send_mail(
            subject="Reset Your TripPlanner Password",
            message=f"""
Hi {user.username},

Click the link below to reset your password:

{reset_link}

If you did not request this, please ignore this email.
""",
            from_email=None,
            recipient_list=[email],
            fail_silently=True,   # 🔴 THIS IS THE KEY
        )
    except Exception:
        pass  # absolutely never crash

    return success_response



# ======================
# RESET PASSWORD
# ======================
from django.utils.http import urlsafe_base64_decode
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator

token_generator = PasswordResetTokenGenerator()

# ======================
# RESET PASSWORD (FIXED)
# ======================
@api_view(["POST"])
def reset_password(request, uid, token):
    password = request.data.get("password")

    if not password:
        return Response({"error": "Password required"}, status=400)

    try:
        user_id = urlsafe_base64_decode(uid).decode()
        user = User.objects.get(pk=user_id)
    except Exception:
        return Response({"error": "Invalid reset link"}, status=400)

    if not token_generator.check_token(user, token):
        return Response({"error": "Token expired or invalid"}, status=400)

    user.set_password(password)
    user.save()

    return Response(
        {"message": "Password reset successful"},
        status=200,
    )
