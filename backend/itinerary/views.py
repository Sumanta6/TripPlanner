from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ai_engine.itinerary_generator import ItineraryEngine

engine = ItineraryEngine()


@api_view(["GET"])
def get_destinations(request):
    """
    Return supported itinerary destinations with duration metadata.
    """
    try:
        data = engine.list_destinations()
        return Response(data, status=status.HTTP_200_OK)
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

        resolved_destination_name = engine._resolve_destination_name(destination_name)
        destination = engine.dest_by_name.get(resolved_destination_name.lower())

        if not destination:
            return Response(
                {
                    "success": False,
                    "message": f"Destination '{destination_name}' is not currently supported in the planner dataset.",
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