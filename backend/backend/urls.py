from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("api/admin/", include("accounts.admin_urls")),
    path("api/", include("contacts.urls")),
    path("api/itinerary/", include("itinerary.urls")),
    path("api/destinations/", include("destinations.urls")),
    path("api/guides/", include("guides.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
