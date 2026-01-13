from django.urls import path
from .views import (
    register,
    login,
    logout,
    google_login,
    forgot_password,
    reset_password,
)

urlpatterns = [
    path("register/", register),
    path("login/", login),
    path("logout/", logout),
    path("google-login/", google_login),

    # 🔐 FORGOT PASSWORD
    path("forgot-password/", forgot_password),
    path("reset-password/<uid>/<token>/", reset_password), 
]
