from django.urls import path

from . import admin_views

urlpatterns = [
    path("login/", admin_views.admin_login),
    path("check-auth/", admin_views.admin_check_auth),
    path("dashboard/", admin_views.admin_dashboard),
    path("users/", admin_views.admin_users),
    path("guides/", admin_views.admin_guides),
    path("bookings/", admin_views.admin_bookings),
    path("bookings/<int:pk>/status/", admin_views.admin_booking_status),
    path("itineraries/", admin_views.admin_itineraries),
]
