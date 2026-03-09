from django.urls import path
from .views import GenerateItineraryView

urlpatterns = [
    path("generate/", GenerateItineraryView.as_view(), name="generate_itinerary"),
]
