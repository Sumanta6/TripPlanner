"""
Destinations API
─────────────────────────────────────────────────────────────────────────────
Two separate surfaces:

  1. /api/itinerary/destinations/  — serves from the local GeoNameDestination
     table (fast, offline-capable, pre-seeded from GeoNames).

  2. /api/destinations/ (legacy)  — kept for backward-compat but now also
     delegates to the local DB instead of making a live Geoapify call.
─────────────────────────────────────────────────────────────────────────────
"""
from django.db.models import Case, F, IntegerField, Q, Value, When
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import GeoNameDestination
from .serializers import GeoNameDestinationSerializer

PAGE_SIZE_DEFAULT = 24
PAGE_SIZE_MAX = 100

PROVINCE_FILTER_MAP = {
    "bagmati":         "Bagmati Province",
    "gandaki":         "Gandaki Province",
    "lumbini":         "Lumbini Province",
    "koshi":           "Koshi Province",
    "madhesh":         "Madhesh Province",
    "karnali":         "Karnali Province",
    "sudurpashchim":   "Sudurpashchim Province",
}

SORT_OPTIONS = {
    "recommended": ["-content_score", "province", "name"],
    "popular": ["-content_score", "name"],
    "name_asc": ["name"],
    "name_desc": ["-name"],
    "region": ["province", "district", "name"],
}


def _build_queryset(params):
    """Shared queryset builder for both views."""
    qs = GeoNameDestination.objects.all()

    # Text search — name, province, district
    search = (params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(province__icontains=search)
            | Q(district__icontains=search)
        )

    # Province filter
    province_key = (params.get("province") or params.get("region") or "").strip().lower()
    if province_key and province_key != "all":
        province_full = PROVINCE_FILTER_MAP.get(province_key, province_key)
        qs = qs.filter(province__icontains=province_full)

    # Category filter (Major City / Village/Town)
    category = (params.get("category") or "").strip().lower()
    if category and category != "all":
        qs = qs.filter(category__icontains=category)

    qs = qs.annotate(
        content_score=Case(
            When(popularity_score__isnull=False, then=F("popularity_score")),
            When(category__iexact="Major City", then=Value(84)),
            When(
                Q(name__icontains="base camp")
                | Q(name__icontains="lake")
                | Q(name__icontains="mustang")
                | Q(name__icontains="manang")
                | Q(name__icontains="khumbu")
                | Q(name__icontains="lukla")
                | Q(name__icontains="namche")
                | Q(name__icontains="rara")
                | Q(name__icontains="phoksundo")
                | Q(name__icontains="himal")
                | Q(name__icontains="pass")
                | Q(name__icontains="hill"),
                then=Value(90),
            ),
            default=Value(76),
            output_field=IntegerField(),
        )
    )

    sort_key = (params.get("sort") or "recommended").strip().lower()
    return qs.order_by(*SORT_OPTIONS.get(sort_key, SORT_OPTIONS["recommended"]))


@api_view(["GET"])
def local_destinations(request):
    """
    GET /api/itinerary/destinations/
    Serves Nepal destinations from the local GeoNameDestination table.

    Query params:
        search      – partial match on name / province / district
        province    – one of: bagmati | gandaki | lumbini | koshi |
                              madhesh | karnali | sudurpashchim | all
        region      – alias for province
        category    – 'Major City' | 'Village/Town' | all
        sort        – recommended | popular | name_asc | name_desc | region
        page        – page number (1-indexed)
        page_size   – items per page (max 100, default 24)
    """
    try:
        page      = max(1, int(request.query_params.get("page", 1)))
        page_size = min(
            PAGE_SIZE_MAX,
            max(1, int(request.query_params.get("page_size", PAGE_SIZE_DEFAULT))),
        )
    except (ValueError, TypeError):
        return Response(
            {"error": "page and page_size must be integers."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    qs = _build_queryset(request.query_params)

    total  = qs.count()
    offset = (page - 1) * page_size
    items  = qs[offset : offset + page_size]

    serializer = GeoNameDestinationSerializer(items, many=True)
    return Response(
        {
            "results":   serializer.data,
            "count":     total,
            "page":      page,
            "page_size": page_size,
            "has_next":  (offset + page_size) < total,
        }
    )


@api_view(["GET"])
def local_destination_detail(request, geoname_id):
    """
    GET /api/itinerary/destinations/<geoname_id>/
    Returns a single destination by its GeoNames ID.
    """
    try:
        dest = GeoNameDestination.objects.get(geoname_id=geoname_id)
    except GeoNameDestination.DoesNotExist:
        return Response(
            {"error": "Destination not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = GeoNameDestinationSerializer(dest)
    return Response(serializer.data)


# ── Legacy /api/destinations/ endpoint ────────────────────────────────────────
# Now delegates to the local DB so Geoapify is no longer required.

from rest_framework.views import APIView  


class GeoapifyDestinationsView(APIView):
    """
    Legacy: GET /api/destinations/
    Redirects logic to local DB; Geoapify key no longer required.
    """
    def get(self, request):
        try:
            page      = max(1, int(request.query_params.get("page", 1)))
            page_size = min(
                PAGE_SIZE_MAX,
                max(1, int(request.query_params.get("page_size", PAGE_SIZE_DEFAULT))),
            )
        except (ValueError, TypeError):
            page, page_size = 1, PAGE_SIZE_DEFAULT

        qs     = _build_queryset(request.query_params)
        total  = qs.count()
        offset = (page - 1) * page_size
        items  = qs[offset : offset + page_size]
        data   = GeoNameDestinationSerializer(items, many=True).data

        return Response(
            {
                "results":   data,
                "count":     total,
                "page":      page,
                "page_size": page_size,
                "has_next":  (offset + page_size) < total,
            }
        )


class GeoapifyDestinationDetailView(APIView):
    """Legacy detail; delegates to local DB."""
    def get(self, request, pk):
        try:
            dest = GeoNameDestination.objects.get(geoname_id=pk)
        except GeoNameDestination.DoesNotExist:
            return Response(
                {"error": "Destination not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(GeoNameDestinationSerializer(dest).data)
