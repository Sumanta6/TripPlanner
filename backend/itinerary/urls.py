from django.urls import path
from . import views
from destinations.views import local_destinations, local_destination_detail

urlpatterns = [
    # ── Local GeoNames destinations (no third-party dependency) ──
    path("destinations/",             local_destinations,          name="local-destinations-list"),
    path("destinations/<int:geoname_id>/", local_destination_detail, name="local-destination-detail"),

    # ── AI itinerary engine destinations ─────────────────────────
    path("planner-destinations/", views.get_destinations, name="planner-supported-destinations"),
    path("generate/", views.generate_itinerary, name="generate-itinerary"),
    path("save/",     views.save_itinerary,      name="save-itinerary"),
    path("my/",       views.my_itineraries,      name="my-itineraries"),
    path("<int:pk>/",        views.itinerary_detail,   name="itinerary-detail"),
    path("<int:pk>/delete/", views.delete_itinerary,   name="delete-itinerary"),
]
