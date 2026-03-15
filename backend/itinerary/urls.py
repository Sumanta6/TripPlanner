from django.urls import path
from .views import generate_itinerary, get_destinations

urlpatterns = [
    path("destinations/", get_destinations, name="itinerary-destinations"),
    path("generate/", generate_itinerary, name="generate-itinerary"),
]