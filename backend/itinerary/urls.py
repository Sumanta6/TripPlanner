from django.urls import path
from . import views

urlpatterns = [
    path("destinations/", views.get_destinations, name="itinerary-destinations"),
    path("generate/", views.generate_itinerary, name="generate-itinerary"),
    path('save/', views.save_itinerary, name='save-itinerary'),
    path('my/', views.my_itineraries, name='my-itineraries'),
    path('<int:pk>/', views.itinerary_detail, name='itinerary-detail'),
    path('<int:pk>/delete/', views.delete_itinerary, name='delete-itinerary'),
]