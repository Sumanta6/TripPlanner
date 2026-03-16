from django.urls import path
from .views import (
    generate_itinerary,
    get_destinations,
    save_itinerary,
    my_itineraries,
    itinerary_detail,
)

urlpatterns = [
    path("destinations/", get_destinations, name="itinerary-destinations"),
    path("generate/", generate_itinerary, name="generate-itinerary"),
    path("save/", save_itinerary, name="save-itinerary"),
    path("my/", my_itineraries, name="my-itineraries"),
    path("<int:pk>/", itinerary_detail, name="itinerary-detail"),
]