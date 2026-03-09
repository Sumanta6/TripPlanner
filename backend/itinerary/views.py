from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import sys
import os

# Add the parent directory to Python path to import ai_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_engine.itinerary_generator import ItineraryEngine

# Load engine once when module loads
engine = ItineraryEngine()

class GenerateItineraryView(APIView):
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            
            # Extract fields expected from Plantrip.jsx formData
            destination = data.get('destination', 'Kathmandu Valley')
            days = data.get('days', 3)
            budget = data.get('budget', 50000)
            travel_style = data.get('travelStyle', 'culture')
            interests = data.get('interests', [])
            travelers = data.get('travelers', 2)
            
            # Generate the itinerary
            result = engine.generate(
                destination_name=destination,
                days=days,
                total_budget=budget,
                travel_style=travel_style,
                interests=interests,
                travelers=travelers
            )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate itinerary: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
