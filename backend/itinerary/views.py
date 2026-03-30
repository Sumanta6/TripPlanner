from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from ai_engine.itinerary_generator import ItineraryEngine
from .models import SavedItinerary
from .serializers import SavedItinerarySerializer, SavedItinerarySummarySerializer

engine = ItineraryEngine()


@api_view(["GET"])
def get_destinations(request):
    """
    Return supported itinerary destinations with duration metadata.
    """
    try:
        data = engine.list_destinations()
        return Response(
            {
                "success": True,
                "results": data,
                "count": len(data),
                "message": "Supported planner destinations fetched successfully.",
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "Failed to fetch destinations.",
                "details": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def generate_itinerary(request):
    try:
        payload = dict(request.data)

        destination_name = str(payload.get("destination", "")).strip()
        starting_place = str(payload.get("starting_place", "")).strip()
        start_date = str(payload.get("start_date", "")).strip()
        pace = str(payload.get("pace", "balanced")).strip().lower()
        hotel_level = str(payload.get("hotel_level", "standard")).strip().lower()
        travel_group = str(payload.get("travel_group", payload.get("group_type", ""))).strip().lower()
        season = str(payload.get("season", "")).strip().lower()

        raw_interests = payload.get("interests", [])
        if isinstance(raw_interests, str):
            interests = [raw_interests.strip().lower()] if raw_interests.strip() else []
        elif isinstance(raw_interests, list):
            interests = [str(x).strip().lower() for x in raw_interests if str(x).strip()]
        else:
            interests = []

        try:
            days = int(payload.get("days", 3))
        except (ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Invalid days value provided. It must be an integer.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if days < 1:
            return Response(
                {
                    "success": False,
                    "message": "Days must be at least 1.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not destination_name:
            return Response(
                {
                    "success": False,
                    "message": "Destination is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        resolved_destination_name, destination = engine.resolve_destination(destination_name)

        if not destination:
            return Response(
                {
                    "success": False,
                    "message": f"'{destination_name}' is not currently supported by the planner.",
                    "suggestions": engine.suggest_destinations(destination_name),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        min_days = int(destination.get("min_days", 1))
        max_days = int(destination.get("max_days", 30))

        adjusted_days = None
        notes = None

        if days < min_days:
            adjusted_days = min_days
        elif days > max_days:
            adjusted_days = max_days

        if adjusted_days is not None:
            days = adjusted_days
            notes = (
                f"Trip duration was automatically adjusted to {days} days "
                f"to fit {destination.get('name')}'s optimal range ({min_days}-{max_days} days)."
            )

        payload["destination"] = resolved_destination_name
        payload["starting_place"] = starting_place if starting_place else "Kathmandu"
        payload["days"] = days
        payload["start_date"] = start_date
        payload["pace"] = pace if pace else "balanced"
        payload["hotel_level"] = hotel_level if hotel_level else "standard"
        payload["travel_group"] = travel_group
        payload["season"] = season
        payload["interests"] = interests

        result = engine.generate_itinerary(payload)

        if not result.get("success"):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        response_data = {
            "success": True,
            "message": result.get("message", "Itinerary generated successfully."),
            "destination": destination.get("name"),
            "starting_place": payload["starting_place"],
            "start_date": start_date,
            "days": days,
            "summary": result.get("summary", {}),
            "travel_tips": result.get("travel_tips", []),
            "transport_notes": result.get("transport_notes", ""),
            "recommended_stay": result.get("recommended_stay", []),
            "itinerary": result.get("itinerary", []),
            "latitude": destination.get("latitude", ItineraryEngine.DEFAULT_MAP_CENTER["lat"]),
            "longitude": destination.get("longitude", ItineraryEngine.DEFAULT_MAP_CENTER["lng"]),
        }

        if adjusted_days is not None:
            response_data["adjusted_days"] = adjusted_days
            response_data["notes"] = notes

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "Failed to generate itinerary.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ── Save & Retrieve Itineraries ───────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_itinerary(request):
    """
    POST /api/itinerary/save/
    Save a generated itinerary to the database for the logged-in traveler.
    """
    data = request.data
    destination = str(data.get("destination", "")).strip()
    if not destination:
        return Response({"error": "Destination is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Calculate end_date from start_date + days
    from datetime import datetime, timedelta
    
    days = data.get('days', 1)
    try:
        days = int(days)
    except ValueError:
        days = 1

    budget = data.get('budget', None)
    travelers = data.get('travelers', 1)

    start_date_str = data.get('start_date')
    start_date_obj = None
    end_date_obj = None
    if start_date_str:
        try:
            start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            if days > 0: # Ensure days is positive for timedelta
                end_date_obj = start_date_obj + timedelta(days=days - 1)
            else:
                end_date_obj = start_date_obj # For 0 or negative days, end date is same as start
        except ValueError:
            pass

    itinerary_obj = SavedItinerary.objects.create(
        traveler=request.user,
        destination=destination,
        starting_place=str(data.get("starting_place", "Kathmandu")).strip(),
        days=days,
        start_date=start_date_obj,
        end_date=end_date_obj,
        budget=budget,
        travelers=travelers,
        notes=str(data.get("notes", "")).strip(),
        itinerary_data=data.get("itinerary_data") or data.get("itinerary") or {},
    )

    serializer = SavedItinerarySerializer(itinerary_obj)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_itineraries(request):
    """
    GET /api/itinerary/my/
    Returns a summary list of itineraries saved by the logged-in traveler.
    """
    qs = SavedItinerary.objects.filter(traveler=request.user)
    serializer = SavedItinerarySummarySerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def itinerary_detail(request, pk):
    """
    GET /api/itinerary/<id>/
    Returns a single saved itinerary (only to its owner).
    """
    try:
        itinerary_obj = SavedItinerary.objects.get(pk=pk, traveler=request.user)
    except SavedItinerary.DoesNotExist:
        return Response({"error": "Itinerary not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = SavedItinerarySerializer(itinerary_obj)
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_itinerary(request, pk):
    try:
        itinerary = SavedItinerary.objects.get(pk=pk, traveler=request.user)
        itinerary.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except SavedItinerary.DoesNotExist:
        return Response({'error': 'Itinerary not found.'}, status=status.HTTP_404_NOT_FOUND)
