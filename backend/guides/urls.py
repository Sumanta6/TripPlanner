from django.urls import path
from . import views

urlpatterns = [
    # Public
    path('', views.guide_list, name='guide-list'),
    path('<int:pk>/', views.guide_detail, name='guide-detail'),

    # Authenticated – /api/guides/me/...
    path('me/', views.my_profile, name='guide-me'),
    path('me/bookings/', views.my_bookings, name='guide-bookings'),
    path('me/activity/', views.my_activity, name='guide-activity'),
    path('me/dashboard/', views.my_dashboard, name='guide-dashboard'),
    
]
