from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("api/", include("contacts.urls")),
    path("api/itinerary/", include("itinerary.urls")),
    path("api/destinations/", include("destinations.urls")),
    path("api/guides/", include("guides.urls")),
]
