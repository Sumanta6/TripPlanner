from django.contrib.auth.models import User
from django.core import signing
from rest_framework import authentication, exceptions


GUIDE_TOKEN_SALT = "tripplanner.guide.auth"
GUIDE_TOKEN_MAX_AGE = 60 * 60 * 24 * 14
ADMIN_TOKEN_SALT = "tripplanner.admin.auth"
ADMIN_TOKEN_MAX_AGE = 60 * 60 * 24 * 14


def build_guide_auth_token(user):
    return signing.dumps(
        {"user_id": user.id, "role": "guide"},
        salt=GUIDE_TOKEN_SALT,
    )


def build_admin_auth_token(user):
    return signing.dumps(
        {"user_id": user.id, "role": "admin"},
        salt=ADMIN_TOKEN_SALT,
    )


class GuideTokenAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode("utf-8").strip()
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = parts[1]
        try:
            payload = signing.loads(token, salt=GUIDE_TOKEN_SALT, max_age=GUIDE_TOKEN_MAX_AGE)
        except signing.BadSignature as exc:
            raise exceptions.AuthenticationFailed("Invalid guide authentication token.") from exc
        except signing.SignatureExpired as exc:
            raise exceptions.AuthenticationFailed("Guide authentication token expired.") from exc

        if payload.get("role") != "guide":
            raise exceptions.AuthenticationFailed("Invalid guide authentication token.")

        try:
            user = User.objects.get(pk=payload.get("user_id"), is_active=True)
        except User.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Guide user not found.") from exc

        return (user, token)


class AdminTokenAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode("utf-8").strip()
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = parts[1]
        try:
            payload = signing.loads(token, salt=ADMIN_TOKEN_SALT, max_age=ADMIN_TOKEN_MAX_AGE)
        except signing.BadSignature as exc:
            raise exceptions.AuthenticationFailed("Invalid admin authentication token.") from exc
        except signing.SignatureExpired as exc:
            raise exceptions.AuthenticationFailed("Admin authentication token expired.") from exc

        if payload.get("role") != "admin":
            raise exceptions.AuthenticationFailed("Invalid admin authentication token.")

        try:
            user = User.objects.get(pk=payload.get("user_id"), is_active=True, is_superuser=True)
        except User.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Admin user not found.") from exc

        return (user, token)
