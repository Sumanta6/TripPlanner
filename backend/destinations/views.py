"""
Destinations API - fetches Nepal tourist places from Geoapify Places API.
"""
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

# Nepal bounding box (lon_min, lat_min, lon_max, lat_max)
NEPAL_BBOX = "80.0586,26.347,88.2015,30.447"

# Map frontend category to Geoapify categories
CATEGORY_MAP = {
    "all": "tourism.sights,natural,religion,museum,accommodation",
    "nature": "natural",
    "temples": "religion",
    "museums": "museum",
    "hotels": "accommodation",
    "sights": "tourism.sights",
}


def normalize_category(geoapify_cat):
    """Map Geoapify category string to our display category."""
    if not geoapify_cat:
        return "Sight"
    cat = str(geoapify_cat).lower()
    if "natural" in cat:
        return "Nature"
    if "religion" in cat or "temple" in cat:
        return "Temples"
    if "museum" in cat:
        return "Museums"
    if "accommodation" in cat or "hotel" in cat:
        return "Hotels"
    return "Sight"


def transform_place(feature, index):
    """Transform Geoapify feature to our clean JSON format."""
    props = feature.get("properties", {})
    geom = feature.get("geometry", {})
    coords = geom.get("coordinates", [0, 0])

    name = props.get("name") or "Unnamed Place"
    address = props.get("address", {})
    if isinstance(address, dict):
        city = address.get("city") or address.get("town") or address.get("village") or ""
        state = address.get("state") or ""
        country = address.get("country") or "Nepal"
        location = ", ".join(filter(None, [city, state, country])) or "Nepal"
    else:
        location = str(address) if address else "Nepal"

    categories = props.get("categories", "")
    if isinstance(categories, str):
        cat_str = categories
    else:
        cat_str = ",".join(categories) if categories else ""
    category = normalize_category(cat_str)

    raw = props.get("datasource", {}).get("raw", {})
    description = raw.get("description") or raw.get("wikipedia") or props.get("description") or ""
    if not description and name:
        description = f"Discover {name} in Nepal. A must-visit destination for travelers."

    place_id = props.get("place_id") or props.get("osm_id") or feature.get("id") or str(index)

    return {
        "id": place_id,
        "name": name,
        "location": location,
        "coordinates": {"lat": coords[1], "lon": coords[0]},
        "category": category,
        "description": (description[:300] + "...") if len(description) > 300 else description,
        "image_url": props.get("image") or None,
    }


class GeoapifyDestinationsView(APIView):
    """
    GET /api/destinations/
    Fetches Nepal tourist places from Geoapify Places API.
    Query params: page, page_size, search, category
    """

    def get(self, request):
        api_key = getattr(settings, "GEOAPIFY_API_KEY", None)
        if not api_key:
            return Response(
                {"error": "GEOAPIFY_API_KEY not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(50, max(1, int(request.query_params.get("page_size", 20))))
        search = (request.query_params.get("search") or "").strip()
        category = (request.query_params.get("category") or "all").lower()

        geoapify_cat = CATEGORY_MAP.get(category, CATEGORY_MAP["all"])
        offset = (page - 1) * page_size

        url = "https://api.geoapify.com/v2/places"
        params = {
            "categories": geoapify_cat,
            "filter": f"rect:{NEPAL_BBOX}",
            "limit": page_size,
            "offset": offset,
            "apiKey": api_key,
        }
        if search:
            params["text"] = search

        try:
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            return Response(
                {"error": f"Geoapify API error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        features = data.get("features", [])
        results = [transform_place(f, i) for i, f in enumerate(features)]

        # If search is provided, optionally filter by name (Geoapify text search may vary)
        if search:
            search_lower = search.lower()
            results = [r for r in results if search_lower in r["name"].lower()]

        has_next = len(features) >= page_size

        return Response({
            "results": results,
            "count": len(results),
            "page": page,
            "page_size": page_size,
            "has_next": has_next,
        })


class GeoapifyDestinationDetailView(APIView):
    """
    GET /api/destinations/:id/
    Fetches a single place by ID from Geoapify Place Details API.
    """

    def get(self, request, pk):
        api_key = getattr(settings, "GEOAPIFY_API_KEY", None)
        if not api_key:
            return Response(
                {"error": "GEOAPIFY_API_KEY not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        url = "https://api.geoapify.com/v2/place-details"
        params = {"id": pk, "apiKey": api_key}

        try:
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 404:
                return Response({"error": "Destination not found"}, status=status.HTTP_404_NOT_FOUND)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            return Response(
                {"error": f"Geoapify API error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Place Details returns FeatureCollection with features array
        features = data.get("features", [])
        if not features:
            return Response({"error": "Destination not found"}, status=status.HTTP_404_NOT_FOUND)

        feat = features[0]
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [0, 0])
        if geom.get("type") == "Point" and len(coords) >= 2:
            lon, lat = coords[0], coords[1]
        else:
            lon, lat = 0, 0

        name = props.get("name") or "Unnamed Place"
        address = props.get("address", {})
        if isinstance(address, dict):
            city = address.get("city") or address.get("town") or address.get("village") or ""
            state = address.get("state") or ""
            country = address.get("country") or "Nepal"
            location = ", ".join(filter(None, [city, state, country])) or "Nepal"
        else:
            location = str(address) if address else "Nepal"

        categories = props.get("categories", "")
        cat_str = ",".join(categories) if isinstance(categories, (list, tuple)) else str(categories)
        category = normalize_category(cat_str)

        description = props.get("description") or ""
        if not description:
            description = f"Discover {name} in Nepal. A must-visit destination for travelers."

        return Response({
            "id": pk,
            "name": name,
            "location": location,
            "coordinates": {"lat": lat, "lon": lon},
            "category": category,
            "description": description,
            "image_url": props.get("image") or None,
        })
