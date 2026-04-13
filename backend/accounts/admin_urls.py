from django.urls import path

from . import admin_views

urlpatterns = [
    path("login/", admin_views.admin_login),
    path("check-auth/", admin_views.admin_check_auth),
    path("dashboard/", admin_views.admin_dashboard),
    path("users/", admin_views.admin_users),
    path("users/<int:pk>/", admin_views.admin_user_detail),
    path("users/<int:pk>/reset-password/", admin_views.admin_user_reset_password),
    path("guides/", admin_views.admin_guides),
    path("guides/<int:pk>/", admin_views.admin_guide_detail),
    path("bookings/", admin_views.admin_bookings),
    path("bookings/<int:pk>/", admin_views.admin_booking_detail),
    path("bookings/<int:pk>/status/", admin_views.admin_booking_status),
    path("itineraries/", admin_views.admin_itineraries),
    path("itineraries/<int:pk>/", admin_views.admin_itinerary_detail),
    path("reviews/", admin_views.admin_reviews),
    path("reviews/<int:pk>/", admin_views.admin_review_detail),
    path("contacts/", admin_views.admin_contacts),
    path("contacts/<int:pk>/", admin_views.admin_contact_detail),
    path("chat-threads/", admin_views.admin_chat_threads),
    path("chat-threads/<int:booking_id>/", admin_views.admin_chat_thread_detail),
]
