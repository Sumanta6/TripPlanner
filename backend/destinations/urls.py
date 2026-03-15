from django.urls import path
from .views import GeoapifyDestinationsView, GeoapifyDestinationDetailView

urlpatterns = [
    path("", GeoapifyDestinationsView.as_view(), name="destination-list"),
    path("<str:pk>/", GeoapifyDestinationDetailView.as_view(), name="destination-detail"),
]
