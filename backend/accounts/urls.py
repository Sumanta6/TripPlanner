from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("guide/login/", views.guide_login),
    path("logout/", views.logout),
    path("google-login/", views.google_login),
    path("guide/google-login/", views.guide_google_login),

    path("forgot-password/", views.forgot_password),
    path("reset-password/<uid>/<token>/", views.reset_password),

    # 🔽 USER DATA
    path("dashboard/", views.dashboard),
    path("trips/create/", views.create_trip),
    path("check-auth/", views.check_auth),
    path("change-password/", views.change_password),
    path("csrf-cookie/", views.csrf_cookie),
    path("profile/me/", views.traveler_profile),
    path("profile/requests/", views.my_guide_requests),
]
