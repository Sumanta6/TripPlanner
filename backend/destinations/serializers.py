from rest_framework import serializers

from .enrichment import build_destination_metadata
from .models import GeoNameDestination


PROVINCE_THEME_MAP = {
    "Bagmati Province": {"theme": "Culture", "duration": "3-5 days"},
    "Gandaki Province": {"theme": "Mountain", "duration": "4-7 days"},
    "Lumbini Province": {"theme": "Heritage", "duration": "2-4 days"},
    "Koshi Province": {"theme": "Expedition", "duration": "5-8 days"},
    "Madhesh Province": {"theme": "Pilgrimage", "duration": "2-3 days"},
    "Karnali Province": {"theme": "Remote Escape", "duration": "5-9 days"},
    "Sudurpashchim Province": {"theme": "Hidden Trails", "duration": "4-7 days"},
}


class GeoNameDestinationSerializer(serializers.ModelSerializer):
    region = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    best_duration = serializers.SerializerMethodField()
    popularity_score = serializers.SerializerMethodField()
    popularity_badge = serializers.SerializerMethodField()
    featured = serializers.SerializerMethodField()
    budget_hint = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()
    travel_tips = serializers.SerializerMethodField()
    trip_suitability = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    short_description = serializers.SerializerMethodField()
    best_for = serializers.SerializerMethodField()
    recommended_days = serializers.SerializerMethodField()
    highlights = serializers.SerializerMethodField()

    class Meta:
        model = GeoNameDestination
        fields = [
            "geoname_id",
            "name",
            "province",
            "district",
            "latitude",
            "longitude",
            "country_code",
            "category",
            "image_url",
            "short_description",
            "best_for",
            "recommended_days",
            "highlights",
            "region",
            "summary",
            "best_duration",
            "popularity_score",
            "popularity_badge",
            "featured",
            "budget_hint",
            "activities",
            "travel_tips",
            "trip_suitability",
            "description",
        ]

    def _metadata(self, obj):
        if not hasattr(obj, "_destination_metadata"):
            obj._destination_metadata = build_destination_metadata(obj)
        return obj._destination_metadata

    def _is_mountain_destination(self, obj):
        return self._metadata(obj)["theme"] in {"high_mountain", "remote_frontier"}

    def get_image_url(self, obj):
        return self._metadata(obj)["image_url"]

    def get_short_description(self, obj):
        return self._metadata(obj)["short_description"]

    def get_best_for(self, obj):
        return self._metadata(obj)["best_for"]

    def get_recommended_days(self, obj):
        return self._metadata(obj)["recommended_days"]

    def get_highlights(self, obj):
        return self._metadata(obj)["highlights"]

    def get_region(self, obj):
        return (obj.province or "Nepal").replace(" Province", "")

    def get_summary(self, obj):
        return self.get_short_description(obj)

    def get_best_duration(self, obj):
        recommended_days = self.get_recommended_days(obj)
        if recommended_days <= 2:
            return "1-2 days"
        if recommended_days == 3:
            return "3 days"
        if recommended_days == 4:
            return "4 days"
        if recommended_days == 5:
            return "5 days"
        if recommended_days == 6:
            return "6 days"
        return f"{recommended_days}+ days"

    def get_popularity_score(self, obj):
        return self._metadata(obj)["popularity_score"]

    def get_popularity_badge(self, obj):
        score = self.get_popularity_score(obj)
        if score >= 90:
            return "Top Pick"
        if score >= 82:
            return "Popular"
        return "Worth Exploring"

    def get_featured(self, obj):
        return self.get_popularity_score(obj) >= 84

    def get_budget_hint(self, obj):
        theme = self._metadata(obj)["theme"]
        if theme == "high_mountain":
            return "Plan for transport and weather-related buffers."
        if theme == "remote_frontier":
            return "Keep extra transit time, cash backup, and a more flexible route plan."
        if theme == "pilgrimage_heritage":
            return "Works well with a compact stay budget and locally guided heritage visits."
        if theme == "wildlife_plains":
            return "Reserve part of the budget for guided activities and transfers."
        if obj.category == "Major City":
            return "Flexible for budget to premium city stays."
        return "Best suited for steady mid-range daily planning."

    def get_activities(self, obj):
        theme = self._metadata(obj)["theme"]
        if theme == "high_mountain":
            return [
                "Scenic trekking and trail walks",
                "Mountain photography",
                "Tea-house stays and local food stops",
            ]
        if theme == "remote_frontier":
            return [
                "Long-form scenic drives or trekking segments",
                "Remote settlement visits",
                "Landscape and culture photography",
            ]
        if theme == "pilgrimage_heritage":
            return [
                "Temple and monastery visits",
                "Old-town walks and heritage circuits",
                "Slow local food and craft stops",
            ]
        if theme == "wildlife_plains":
            return [
                "Nature activities and day excursions",
                "Regional market stops",
                "Relaxed base-town evenings",
            ]
        if obj.category == "Major City":
            return [
                "Cultural landmarks and old-town walks",
                "Food exploration and local markets",
                "Easy day trips from a comfortable base",
            ]
        return [
            "Slow travel through local neighborhoods",
            "Short walks and scenic viewpoints",
            "Regional culture and community stops",
        ]

    def get_travel_tips(self, obj):
        theme = self._metadata(obj)["theme"]
        if theme == "high_mountain":
            return [
                "Pack layers and confirm trail or flight conditions before departure.",
                "Keep acclimatization time in the route instead of compressing the schedule.",
                "Start movement days early when visibility and transport windows are better.",
            ]
        if theme == "remote_frontier":
            return [
                "Expect longer transfer days and keep one buffer day in the itinerary.",
                "Carry cash, chargers, and offline route notes before leaving major hubs.",
                "Book transport and simple stays ahead in peak travel windows.",
            ]
        if theme == "pilgrimage_heritage":
            return [
                "Visit sacred sites early for a calmer experience and softer light.",
                "Dress respectfully and check local access rules around major festivals.",
                "Keep room in the plan for nearby heritage stops rather than rushing through.",
            ]
        if theme == "wildlife_plains":
            return [
                "Start nature activities early to avoid midday heat and improve sightings.",
                "Carry light layers, sun protection, and water for lower-elevation days.",
                "Group nearby stops together to reduce repeated transfers.",
            ]
        tips = [
            "Check weather and road conditions before departure.",
            "Start long transfer days early to keep daylight margins.",
            "Carry cash backup for smaller towns and transport hubs.",
        ]
        if obj.category == "Major City":
            tips[2] = "Use the city as a base for nearby day trips and early transport connections."
        return tips

    def get_trip_suitability(self, obj):
        best_for = self.get_best_for(obj)
        if len(best_for) >= 3:
            return best_for[:3]
        if self._is_mountain_destination(obj):
            return ["Adventure", "Nature", "Photography"]
        if obj.category == "Major City":
            return ["Culture", "Families", "Flexible itineraries"]
        return ["Slow travel", "Culture", "Road-trip stops"]

    def get_description(self, obj):
        region = self.get_region(obj)
        district = obj.district or region
        province_theme = PROVINCE_THEME_MAP.get(obj.province or "", {}).get("theme", "Travel")
        return (
            f"{self.get_short_description(obj)} {obj.name} sits in {district}, {region}, and works well as a "
            f"{province_theme.lower()} base for travelers exploring Nepal with a {obj.category.lower()} rhythm."
        )
