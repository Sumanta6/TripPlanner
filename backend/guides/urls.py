from django.urls import path
from . import views

urlpatterns = [
    # Public
    path('', views.guide_list, name='guide-list'),
    path('<int:pk>/', views.guide_detail, name='guide-detail'),
    path('<int:pk>/reviews/', views.guide_reviews, name='guide-reviews'),
    path('<int:pk>/request/', views.request_guide, name='request-guide'),
    path('bookings/<int:pk>/cancel/', views.cancel_booking, name='cancel-booking'),
    path('bookings/<int:pk>/payment/initiate/', views.initiate_esewa_payment, name='initiate-esewa-payment'),
    path('bookings/payment/verify/', views.verify_esewa_payment, name='verify-esewa-payment'),
    path('bookings/<int:pk>/chat/', views.booking_chat, name='booking-chat'),

    # Authenticated – /api/guides/me/...
    path('me/', views.my_profile, name='guide-me'),
    path('me/bookings/', views.my_bookings, name='guide-bookings'),
    path('me/bookings/<int:pk>/', views.booking_detail, name='booking-detail'),
    path('me/bookings/<int:pk>/status/', views.update_booking_status, name='update-booking-status'),
    path('me/activity/', views.my_activity, name='guide-activity'),
    path('me/dashboard/', views.my_dashboard, name='guide-dashboard'),
    path('my-trips/', views.my_booked_trips, name='traveler-trips'),
    path('reviews/', views.create_review, name='create-review'),
]
