from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("logout/", views.logout),
    path("google-login/", views.google_login),

    path("forgot-password/", views.forgot_password),
    path("reset-password/<uid>/<token>/", views.reset_password),

    # 🔽 USER DATA
    path("dashboard/", views.dashboard),
    path("trips/create/", views.create_trip),
    path("check-auth/", views.check_auth),

]
