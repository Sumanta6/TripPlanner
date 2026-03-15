import json
import os


ALL_BUDGETS = ["backpacking", "budget", "standard", "luxury"]
DEFAULT_GROUPS = ["solo", "couple", "friends", "family"]
DEFAULT_PACES = ["slow", "balanced", "fast"]
DEFAULT_SEASONS = ["spring", "summer", "autumn", "winter"]


def make_activity(
    title,
    time_of_day,
    category,
    duration_hours,
    notes="",
    area="",
    cost_tier=None,
    tags=None,
    interest_tags=None,
    group_tags=None,
    pace_tags=None,
    season_tags=None,
    hotel_tags=None,
    is_core=False,
    is_optional=False,
):
    base_tags = tags or [category.lower()]
    return {
        "title": title,
        "time_of_day": time_of_day,
        "category": category,
        "duration_hours": duration_hours,
        "notes": notes,
        "area": area,
        "cost_tier": cost_tier or ALL_BUDGETS,
        "tags": base_tags,
        "interest_tags": interest_tags or base_tags,
        "group_tags": group_tags or DEFAULT_GROUPS,
        "pace_tags": pace_tags or DEFAULT_PACES,
        "season_tags": season_tags or DEFAULT_SEASONS,
        "hotel_tags": hotel_tags or [],
        "is_core": is_core,
        "is_optional": is_optional,
    }


def make_destination(
    name,
    dest_type,
    region,
    min_days,
    recommended_days,
    max_days,
    activities,
    travel_tips,
    accommodation_options,
    altitude_m=None,
    nearby_day_trips=None,
    experience_activities=None,
    transport_notes="",
    tags=None,
):
    return {
        "name": name,
        "type": dest_type,
        "region": region,
        "altitude_m": altitude_m,
        "min_days": min_days,
        "recommended_days": recommended_days,
        "max_days": max_days,
        "tags": tags or [dest_type.lower()],
        "activities": activities,
        "nearby_day_trips": nearby_day_trips or [],
        "experience_activities": experience_activities or [],
        "travel_tips": travel_tips,
        "transport_notes": transport_notes,
        "accommodation_options": accommodation_options,
    }


def make_trek_destination(
    name,
    region,
    min_days,
    recommended_days,
    max_days,
    travel_tips,
    accommodation_options,
    trek_template,
    altitude_m=None,
    tags=None,
):
    return {
        "name": name,
        "type": "trekking",
        "region": region,
        "altitude_m": altitude_m,
        "min_days": min_days,
        "recommended_days": recommended_days,
        "max_days": max_days,
        "tags": tags or ["trekking", "mountains", "adventure"],
        "activities": [],
        "nearby_day_trips": [],
        "experience_activities": [],
        "travel_tips": travel_tips,
        "transport_notes": "Trek route with teahouse/lodge progression",
        "accommodation_options": accommodation_options,
        "trek_template": trek_template,
    }


def generated_city_destination(name, region, base_theme="culture"):
    is_heritage_town = name in {
        "Bandipur", "Tansen", "Gorkha", "Patan", "Bhaktapur", "Kirtipur",
        "Panauti", "Nuwakot", "Bungamati", "Khokana", "Janakpur"
    }
    is_hill_town = name in {
        "Dhulikhel", "Bhedetar", "Kakani", "Nagarkot", "Charikot", "Rupakot", "Kahun Danda"
    }

    dest_type = "cultural" if is_heritage_town else "hill_station" if is_hill_town else "city"
    dest_tags = ["city", "culture", "food"] if not is_hill_town else ["nature", "scenic", "hill", "relaxation"]
    if is_heritage_town:
        dest_tags = ["culture", "heritage", "history", "food"]

    morning_title = f"{name} heritage and local area walk" if is_heritage_town else (
        f"{name} scenic morning walk" if is_hill_town else f"{name} local highlights walk"
    )
    afternoon_title = f"{name} main heritage circuit" if is_heritage_town else (
        f"{name} viewpoint and town exploration" if is_hill_town else f"{name} main attraction circuit"
    )
    evening_title = f"{name} evening food and market experience"

    return make_destination(
        name=name,
        dest_type=dest_type,
        region=region,
        min_days=2,
        recommended_days=3,
        max_days=5,
        tags=dest_tags,
        activities=[
            make_activity(
                morning_title,
                "Morning",
                "culture" if is_heritage_town else "nature" if is_hill_town else "walking",
                3,
                f"Start the day by exploring the main streets, viewpoints, landmarks, and cultural corners of {name}.",
                name,
                tags=["culture", "history", "walking"] if is_heritage_town else ["nature", "scenic", "walking"] if is_hill_town else ["city", "walking", "culture"],
                interest_tags=["culture", "history", "photography"] if is_heritage_town else ["nature", "photography", "relaxation"] if is_hill_town else ["culture", "city", "photography"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_core=True,
            ),
            make_activity(
                afternoon_title,
                "Afternoon",
                "heritage" if is_heritage_town else "nature" if is_hill_town else "sightseeing",
                3,
                f"Visit the main sightseeing areas and enjoy the strongest local atmosphere of {name}.",
                name,
                tags=["heritage", "history", "photography"] if is_heritage_town else ["nature", "viewpoint", "scenic"] if is_hill_town else ["sightseeing", "city"],
                interest_tags=["history", "culture", "photography"] if is_heritage_town else ["nature", "photography"] if is_hill_town else ["culture", "city"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["balanced", "fast"],
                is_core=True,
            ),
            make_activity(
                evening_title,
                "Evening",
                "food",
                2,
                f"Try local food, enjoy the market area, and spend a relaxed evening in {name}.",
                name,
                tags=["food", "culture", "relaxation"],
                interest_tags=["food", "culture", "relaxation"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_core=True,
            ),
        ],
        nearby_day_trips=[
            make_activity(
                f"Nearby scenic excursion from {name}",
                "Afternoon",
                "nature",
                5,
                f"Take a half-day scenic excursion near {name} for viewpoints, local villages, or peaceful surroundings.",
                f"Near {name}",
                tags=["nature", "scenic", "photography"],
                interest_tags=["nature", "photography", "relaxation"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_optional=True,
            )
        ],
        experience_activities=[
            make_activity(
                f"Local café and slow exploration in {name}",
                "Evening",
                "relaxation",
                2,
                f"Spend extra time in cafés, food spots, and local gathering areas around {name}.",
                name,
                tags=["relaxation", "food", "local"],
                interest_tags=["food", "relaxation", "culture"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_optional=True,
            ),
            make_activity(
                f"Flexible photography and neighborhood stroll in {name}",
                "Afternoon",
                "walking",
                2,
                f"Keep some time for local photography, side lanes, and unplanned discoveries around {name}.",
                name,
                tags=["walking", "photography", "local"],
                interest_tags=["photography", "culture", "relaxation"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_optional=True,
            ),
        ],
        travel_tips=[
            f"Start early to make the most of {name}.",
            "Carry cash for local purchases and entry tickets.",
            "Respect local customs and dress modestly where needed.",
        ],
        transport_notes=f"Local taxis, short walks, and private vehicle options are suitable around {name}.",
        accommodation_options={
            "backpacking": [f"Budget guesthouse in {name}"],
            "budget": [f"Clean budget hotel in {name}"],
            "standard": [f"Comfortable hotel in {name}"],
            "luxury": [f"Premium stay in {name}"],
        },
    )


def generated_wildlife_destination(name, region):
    return make_destination(
        name=name,
        dest_type="wildlife",
        region=region,
        min_days=2,
        recommended_days=3,
        max_days=4,
        tags=["wildlife", "nature", "forest", "outdoor"],
        activities=[
            make_activity(
                f"{name} morning safari",
                "Morning",
                "wildlife",
                4,
                f"Take a guided safari in {name} for the best wildlife viewing conditions.",
                name,
                tags=["wildlife", "nature", "adventure"],
                interest_tags=["wildlife", "nature", "photography"],
                group_tags=["solo", "couple", "friends", "family"],
                pace_tags=["balanced", "fast"],
                is_core=True,
            ),
            make_activity(
                f"{name} guided jungle walk",
                "Morning",
                "wildlife",
                3,
                f"Spend part of the day with a trained naturalist in buffer-zone habitats around {name}.",
                name,
                tags=["wildlife", "nature", "walking"],
                interest_tags=["wildlife", "nature", "adventure"],
                group_tags=["solo", "couple", "friends"],
                pace_tags=["balanced", "fast"],
                is_core=True,
            ),
            make_activity(
                f"{name} river or wetland exploration",
                "Afternoon",
                "nature",
                3,
                f"Use the afternoon for canoeing, birdwatching, or riverside nature observation around {name}.",
                name,
                tags=["nature", "wildlife", "birdwatching"],
                interest_tags=["nature", "wildlife", "relaxation", "photography"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_core=True,
            ),
            make_activity(
                f"{name} cultural evening program",
                "Evening",
                "culture",
                2,
                f"Enjoy local food and a cultural program after the day's wildlife activities.",
                name,
                tags=["culture", "food", "relaxation"],
                interest_tags=["culture", "food", "relaxation"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_core=True,
            ),
        ],
        nearby_day_trips=[
            make_activity(
                f"Extra wildlife buffer excursion near {name}",
                "Morning",
                "wildlife",
                4,
                f"Keep an extra half-day for a second wildlife drive or birding-focused excursion around {name}.",
                f"Near {name}",
                tags=["wildlife", "birdwatching", "nature"],
                interest_tags=["wildlife", "nature", "photography"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["balanced", "fast"],
                is_optional=True,
            )
        ],
        experience_activities=[
            make_activity(
                f"Local village and food exploration near {name}",
                "Evening",
                "food",
                2,
                f"Spend extra time around the local settlement area, trying food and observing local daily life.",
                name,
                tags=["food", "culture", "relaxation"],
                interest_tags=["food", "culture", "relaxation"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_optional=True,
            )
        ],
        travel_tips=[
            "Wear neutral colors and follow guide instructions closely.",
            "Carry insect repellent and a hat.",
            "Do not expect wildlife sightings on demand; patience helps.",
        ],
        transport_notes=f"Local jeep, lodge pickup, and guided transport are common around {name}.",
        accommodation_options={
            "backpacking": [f"Basic lodge near {name}"],
            "budget": [f"Eco lodge near {name}"],
            "standard": [f"Jungle resort near {name}"],
            "luxury": [f"Premium wildlife lodge near {name}"],
        },
    )


def generated_lake_destination(name, region):
    high_altitude = name in {"Gosaikunda", "Tilicho Lake", "Gokyo Lakes"}
    relaxed_lake = name in {"Begnas Lake", "Rupa Lake", "Phewa Lake"}

    return make_destination(
        name=name,
        dest_type="nature",
        region=region,
        min_days=2,
        recommended_days=3,
        max_days=5,
        tags=["lake", "nature", "scenic", "photography"],
        activities=[
            make_activity(
                f"Morning views around {name}",
                "Morning",
                "nature",
                3,
                f"Enjoy calm morning scenery and photography around {name}.",
                name,
                tags=["nature", "scenic", "photography", "lake"],
                interest_tags=["nature", "photography", "relaxation"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                season_tags=["spring", "autumn", "winter"] if high_altitude else DEFAULT_SEASONS,
                is_core=True,
            ),
            make_activity(
                f"Boating and lakeside relaxation at {name}" if relaxed_lake else f"Lake exploration around {name}",
                "Afternoon",
                "relaxation",
                3,
                f"Spend a relaxed afternoon by the water, on the trail, or in the surrounding viewpoints near {name}.",
                name,
                tags=["relaxation", "lake", "nature"],
                interest_tags=["relaxation", "nature", "photography"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                season_tags=["spring", "autumn", "winter"] if high_altitude else DEFAULT_SEASONS,
                is_core=True,
            ),
            make_activity(
                f"Sunset by {name}",
                "Evening",
                "relaxation",
                2,
                f"End the day with a quiet sunset and dinner or rest period near {name}.",
                name,
                tags=["relaxation", "scenic", "photography"],
                interest_tags=["relaxation", "photography", "nature"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_core=True,
            ),
        ],
        nearby_day_trips=[
            make_activity(
                f"Scenic ridge or village excursion near {name}",
                "Morning",
                "nature",
                5,
                f"Take a short excursion for a broader mountain, forest, or village-side perspective near {name}.",
                f"Near {name}",
                tags=["nature", "scenic", "photography", "walking"],
                interest_tags=["nature", "photography", "walking"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["balanced", "fast"],
                is_optional=True,
            )
        ],
        experience_activities=[
            make_activity(
                f"Quiet lakeside café or picnic time at {name}",
                "Afternoon",
                "relaxation",
                2,
                f"Use extra time for slow travel, reading, photography, or a calm meal near {name}.",
                name,
                tags=["relaxation", "food", "scenic"],
                interest_tags=["relaxation", "food", "photography"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow"],
                is_optional=True,
            )
        ],
        travel_tips=[
            "Weather can change quickly near lakes and high viewpoints.",
            "Carry a light jacket for morning and evening.",
        ],
        transport_notes=f"Private vehicle, local bus, or short hikes may be needed to reach {name}.",
        accommodation_options={
            "backpacking": [f"Basic guesthouse near {name}"],
            "budget": [f"Budget lodge near {name}"],
            "standard": [f"Comfortable hotel near {name}"],
            "luxury": [f"Premium lakeside resort near {name}"],
        },
    )


def generated_adventure_destination(name, region):
    water_based = name in {"Bhote Koshi", "Trishuli River", "Bhotekoshi Rafting Zone"}
    mountain_based = name in {"Mardi Himal Base Area", "Kalinchowk", "Pathibhara", "Muktinath", "Tatopani"}

    return make_destination(
        name=name,
        dest_type="adventure",
        region=region,
        min_days=2,
        recommended_days=3,
        max_days=5,
        tags=["adventure", "nature", "outdoor"],
        activities=[
            make_activity(
                f"{name} signature adventure session",
                "Morning",
                "adventure",
                4,
                f"Start the day with the main adventure experience around {name}.",
                name,
                tags=["adventure", "outdoor"],
                interest_tags=["adventure", "nature", "photography"],
                group_tags=["solo", "couple", "friends"],
                pace_tags=["balanced", "fast"],
                season_tags=["spring", "autumn", "winter"] if mountain_based else DEFAULT_SEASONS,
                cost_tier=["budget", "standard", "luxury"],
                is_core=True,
            ),
            make_activity(
                f"{name} local exploration",
                "Afternoon",
                "nature",
                3,
                f"Spend the afternoon exploring the surrounding area of {name}.",
                name,
                tags=["nature", "scenic", "walking"],
                interest_tags=["nature", "photography", "culture"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["balanced", "fast"],
                is_core=True,
            ),
            make_activity(
                f"{name} relaxed evening recovery",
                "Evening",
                "relaxation",
                2,
                f"Use the evening to recover, dine, and enjoy the local atmosphere near {name}.",
                name,
                tags=["relaxation", "food"],
                interest_tags=["relaxation", "food"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_core=True,
            ),
        ],
        nearby_day_trips=[
            make_activity(
                f"Extra scenic excursion near {name}",
                "Morning",
                "nature",
                5,
                f"Keep an additional half-day for scenic viewpoints, village visits, or trail sections near {name}.",
                f"Near {name}",
                tags=["nature", "scenic", "photography"],
                interest_tags=["nature", "photography", "walking"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["balanced", "fast"],
                is_optional=True,
            )
        ],
        experience_activities=[
            make_activity(
                f"Recovery café, hot spring, or wellness time near {name}",
                "Afternoon",
                "relaxation",
                2,
                f"Use extra time for recovery, food, or a slower local experience after active blocks near {name}.",
                name,
                tags=["relaxation", "wellness", "food"],
                interest_tags=["relaxation", "food", "wellness"],
                group_tags=DEFAULT_GROUPS,
                pace_tags=["slow", "balanced"],
                is_optional=True,
            )
        ],
        travel_tips=[
            "Check weather conditions before adventure activities.",
            "Use licensed operators and proper safety gear.",
        ],
        transport_notes=f"Travel logistics around {name} depend on the specific activity and route.",
        accommodation_options={
            "backpacking": [f"Basic stay near {name}"],
            "budget": [f"Budget lodge near {name}"],
            "standard": [f"Comfortable hotel near {name}"],
            "luxury": [f"Premium resort near {name}"],
        },
    )


def create_dataset():
    destinations = []

    destinations.append(
        make_destination(
            name="Kathmandu Valley",
            dest_type="cultural",
            region="Bagmati",
            min_days=2,
            recommended_days=4,
            max_days=7,
            tags=["culture", "heritage", "history", "city", "food"],
            activities=[
                make_activity(
                    "Pashupatinath Temple Visit",
                    "Morning",
                    "culture",
                    3,
                    "Visit one of Nepal's most important Hindu temples early in the day.",
                    "Pashupatinath",
                    tags=["culture", "religious", "history"],
                    interest_tags=["culture", "history", "spiritual"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Boudhanath Stupa Exploration",
                    "Afternoon",
                    "culture",
                    2,
                    "Walk around the stupa, spin prayer wheels, and enjoy rooftop cafés.",
                    "Boudhanath",
                    tags=["culture", "religious", "relaxation"],
                    interest_tags=["culture", "spiritual", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Thamel Evening Stroll & Dinner",
                    "Evening",
                    "food",
                    3,
                    "Explore shops, cafés, and food streets in Thamel.",
                    "Thamel",
                    tags=["relaxation", "food", "city"],
                    interest_tags=["food", "city", "shopping"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced", "fast"],
                    is_core=True,
                ),
                make_activity(
                    "Patan Durbar Square Art Tour",
                    "Morning",
                    "history",
                    3,
                    "Discover temples, courtyards, and Newari art in Patan.",
                    "Patan",
                    tags=["culture", "history", "art"],
                    interest_tags=["culture", "history", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Bhaktapur Heritage Walk",
                    "Afternoon",
                    "history",
                    4,
                    "Visit the old squares, pottery area, and traditional lanes of Bhaktapur.",
                    "Bhaktapur",
                    tags=["culture", "history", "photography"],
                    interest_tags=["culture", "history", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced", "fast"],
                    is_core=True,
                ),
                make_activity(
                    "Evening Aarti at Pashupatinath",
                    "Evening",
                    "religious",
                    2,
                    "Experience the spiritual evening aarti ceremony by the river.",
                    "Pashupatinath",
                    tags=["culture", "religious", "spiritual"],
                    interest_tags=["spiritual", "culture"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
            ],
            nearby_day_trips=[
                make_activity(
                    "Chandragiri Hills Excursion",
                    "Morning",
                    "nature",
                    5,
                    "Take the cable car for mountain views and a relaxed hill visit.",
                    "Chandragiri",
                    tags=["nature", "scenic", "photography"],
                    interest_tags=["nature", "photography", "relaxation"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced"],
                    is_optional=True,
                ),
                make_activity(
                    "Nagarkot Viewpoint Day Trip",
                    "Afternoon",
                    "nature",
                    6,
                    "Head out for valley and Himalayan viewpoints around Nagarkot.",
                    "Nagarkot",
                    tags=["nature", "scenic", "photography"],
                    interest_tags=["nature", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced", "fast"],
                    is_optional=True,
                ),
            ],
            experience_activities=[
                make_activity(
                    "Newari Food Experience",
                    "Evening",
                    "food",
                    2,
                    "Try Newari dishes and enjoy local flavors in a traditional setting.",
                    "Kathmandu Valley",
                    tags=["food", "culture", "relaxation"],
                    interest_tags=["food", "culture"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_optional=True,
                ),
            ],
            travel_tips=[
                "Dress modestly at temples and heritage sites.",
                "Keep small cash ready for entry fees and local purchases.",
                "Traffic can be heavy, so start sightseeing early.",
            ],
            transport_notes="Private car, taxi, Pathao/InDrive, and short walks work best within the valley.",
            accommodation_options={
                "backpacking": ["Zostel Kathmandu", "Budget hostel in Thamel"],
                "budget": ["Clean guesthouse in Thamel", "Budget hotel in Patan"],
                "standard": ["Kathmandu Guest House", "Comfortable city hotel"],
                "luxury": ["Dwarika's Hotel", "Premium hotel in Kathmandu"],
            },
        )
    )

    destinations.append(
        make_destination(
            name="Pokhara",
            dest_type="city",
            region="Gandaki",
            min_days=2,
            recommended_days=4,
            max_days=6,
            tags=["city", "lake", "adventure", "nature", "mountains", "food"],
            activities=[
                make_activity(
                    "Sarangkot Sunrise View",
                    "Morning",
                    "nature",
                    3,
                    "Start early for mountain sunrise views over Annapurna and Machhapuchhre.",
                    "Sarangkot",
                    tags=["nature", "scenic", "photography", "mountains"],
                    interest_tags=["nature", "photography", "mountains"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced", "fast"],
                    season_tags=["spring", "autumn", "winter"],
                    is_core=True,
                ),
                make_activity(
                    "Paragliding",
                    "Morning",
                    "adventure",
                    3,
                    "Experience Pokhara's famous paragliding under suitable weather conditions.",
                    "Sarangkot",
                    cost_tier=["standard", "luxury"],
                    tags=["adventure", "mountains", "photography"],
                    interest_tags=["adventure", "photography"],
                    group_tags=["solo", "couple", "friends"],
                    pace_tags=["balanced", "fast"],
                    season_tags=["spring", "autumn", "winter"],
                    is_core=True,
                ),
                make_activity(
                    "Phewa Lake Boating",
                    "Afternoon",
                    "relaxation",
                    2,
                    "Enjoy a calm boat ride on Phewa Lake with lakeside views.",
                    "Phewa Lake",
                    tags=["relaxation", "lake", "nature"],
                    interest_tags=["relaxation", "nature", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "World Peace Pagoda Hike",
                    "Morning",
                    "nature",
                    4,
                    "Take a scenic hike or drive to the World Peace Pagoda for panoramic views.",
                    "Peace Pagoda",
                    tags=["nature", "photography", "hiking"],
                    interest_tags=["nature", "photography", "hiking"],
                    group_tags=["solo", "couple", "friends"],
                    pace_tags=["balanced", "fast"],
                    is_core=True,
                ),
                make_activity(
                    "Davis Falls & Gupteshwor Cave",
                    "Afternoon",
                    "culture",
                    2,
                    "Visit two of Pokhara's classic sightseeing spots in one route.",
                    "Pokhara South",
                    tags=["culture", "sightseeing", "city"],
                    interest_tags=["culture", "sightseeing"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced", "fast"],
                    is_core=True,
                ),
                make_activity(
                    "International Mountain Museum",
                    "Afternoon",
                    "culture",
                    2,
                    "Learn about Himalayan climbing history and mountain cultures.",
                    "Pokhara",
                    tags=["culture", "history", "mountains"],
                    interest_tags=["culture", "history", "mountains"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Lakeside Evening Walk & Live Music",
                    "Evening",
                    "food",
                    3,
                    "Spend the evening at Lakeside with cafés, dinner, and soft nightlife.",
                    "Lakeside",
                    tags=["relaxation", "food", "city"],
                    interest_tags=["food", "relaxation", "city"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
            ],
            nearby_day_trips=[
                make_activity(
                    "Begnas Lake Excursion",
                    "Afternoon",
                    "nature",
                    5,
                    "Take a peaceful trip to Begnas Lake for a quieter day than central Pokhara.",
                    "Begnas Lake",
                    tags=["nature", "lake", "relaxation"],
                    interest_tags=["nature", "relaxation", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_optional=True,
                ),
                make_activity(
                    "Dhampus Village Short Hike",
                    "Morning",
                    "nature",
                    6,
                    "Enjoy a scenic village hike with mountain views and a rural feel.",
                    "Dhampus",
                    tags=["nature", "hiking", "photography"],
                    interest_tags=["nature", "hiking", "photography"],
                    group_tags=["solo", "couple", "friends"],
                    pace_tags=["balanced", "fast"],
                    is_optional=True,
                ),
                make_activity(
                    "Australian Camp Day Hike",
                    "Morning",
                    "nature",
                    6,
                    "Take a classic short hill hike with panoramic Himalayan viewpoints.",
                    "Australian Camp",
                    tags=["nature", "hiking", "mountains", "photography"],
                    interest_tags=["nature", "hiking", "mountains"],
                    group_tags=["solo", "couple", "friends"],
                    pace_tags=["balanced", "fast"],
                    is_optional=True,
                ),
            ],
            experience_activities=[
                make_activity(
                    "Local café and lakeside downtime",
                    "Evening",
                    "relaxation",
                    2,
                    "Keep the evening easy with a café stop, dinner, and a relaxed lakeside atmosphere.",
                    "Lakeside",
                    tags=["relaxation", "food"],
                    interest_tags=["relaxation", "food"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_optional=True,
                ),
                make_activity(
                    "Pokhara cycling or wellness session",
                    "Afternoon",
                    "relaxation",
                    2,
                    "Use extra time for cycling, a spa, yoga, or a slower local experience.",
                    "Pokhara",
                    tags=["relaxation", "wellness"],
                    interest_tags=["wellness", "relaxation", "cycling"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_optional=True,
                ),
            ],
            travel_tips=[
                "October to November and March to April are great for clear mountain views.",
                "Adventure activities depend on weather and should be booked in advance.",
                "Start early for sunrise viewpoints and longer day trips.",
            ],
            transport_notes="Tourist bus, flight, private vehicle, taxis, and short walks are common around Pokhara.",
            accommodation_options={
                "backpacking": ["Lakeside hostel", "Budget guesthouse near Lakeside"],
                "budget": ["Clean budget hotel in Lakeside", "Trekker-friendly hotel"],
                "standard": ["Temple Tree Resort", "Comfortable hotel near Phewa"],
                "luxury": ["Fish Tail Lodge", "Premium lakeside resort"],
            },
        )
    )

    destinations.append(
        make_destination(
            name="Chitwan National Park",
            dest_type="wildlife",
            region="Terai",
            min_days=2,
            recommended_days=3,
            max_days=4,
            tags=["wildlife", "nature", "forest", "culture"],
            activities=[
                make_activity(
                    "Morning Jeep Safari",
                    "Morning",
                    "wildlife",
                    4,
                    "Head into the park early for the best wildlife viewing window.",
                    "Chitwan",
                    tags=["wildlife", "nature"],
                    interest_tags=["wildlife", "nature", "photography"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced", "fast"],
                    is_core=True,
                ),
                make_activity(
                    "Guided Jungle Walk",
                    "Morning",
                    "wildlife",
                    3,
                    "Walk with a trained naturalist through buffer zone habitats.",
                    "Chitwan",
                    tags=["wildlife", "adventure", "nature"],
                    interest_tags=["wildlife", "nature", "adventure"],
                    group_tags=["solo", "couple", "friends"],
                    pace_tags=["balanced", "fast"],
                    is_core=True,
                ),
                make_activity(
                    "Rapti River Canoe Ride",
                    "Afternoon",
                    "nature",
                    2,
                    "Glide along the river and keep an eye out for birds and crocodiles.",
                    "Rapti River",
                    tags=["nature", "wildlife", "birdwatching"],
                    interest_tags=["nature", "wildlife", "relaxation"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Tharu Cultural Dance Show",
                    "Evening",
                    "culture",
                    2,
                    "Enjoy a local cultural performance after the safari day.",
                    "Sauraha",
                    tags=["culture", "relaxation", "food"],
                    interest_tags=["culture", "food", "relaxation"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Rapti Sunset View",
                    "Evening",
                    "relaxation",
                    1,
                    "End the day with a quieter riverbank sunset.",
                    "Rapti River",
                    tags=["relaxation", "scenic", "photography"],
                    interest_tags=["relaxation", "photography", "nature"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_optional=True,
                ),
            ],
            experience_activities=[
                make_activity(
                    "Local village and food exploration",
                    "Evening",
                    "food",
                    2,
                    "Spend some extra time around Sauraha trying local food and markets.",
                    "Sauraha",
                    tags=["food", "culture", "relaxation"],
                    interest_tags=["food", "culture", "relaxation"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_optional=True,
                ),
            ],
            travel_tips=[
                "Wear neutral colors and follow park rules carefully.",
                "Do not expect wildlife sightings to be guaranteed every time.",
                "Carry insect repellent and sun protection.",
            ],
            transport_notes="Private jeep, lodge vehicles, and guided local transport are common.",
            accommodation_options={
                "backpacking": ["Basic lodge in Sauraha"],
                "budget": ["Eco lodge in Sauraha"],
                "standard": ["Jungle resort near the park"],
                "luxury": ["Premium wildlife lodge"],
            },
        )
    )

    destinations.append(
        make_destination(
            name="Lumbini",
            dest_type="cultural",
            region="Terai",
            min_days=1,
            recommended_days=2,
            max_days=3,
            tags=["culture", "spiritual", "history", "peaceful"],
            activities=[
                make_activity(
                    "Maya Devi Temple Visit",
                    "Morning",
                    "religious",
                    2,
                    "Start at the sacred birthplace of Buddha before the site gets busier.",
                    "Maya Devi Temple",
                    tags=["religious", "culture", "history", "spiritual"],
                    interest_tags=["spiritual", "culture", "history"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Monastic Zone Exploration",
                    "Afternoon",
                    "culture",
                    4,
                    "Explore monasteries from different countries across the monastic zone.",
                    "Monastic Zone",
                    tags=["culture", "religious", "history"],
                    interest_tags=["culture", "history", "spiritual"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["balanced"],
                    is_core=True,
                ),
                make_activity(
                    "Meditation or quiet reflection",
                    "Morning",
                    "relaxation",
                    2,
                    "Spend some peaceful time in a quiet spiritual setting.",
                    "Lumbini",
                    tags=["relaxation", "spiritual", "peaceful"],
                    interest_tags=["spiritual", "relaxation"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow"],
                    is_optional=True,
                ),
                make_activity(
                    "World Peace Pagoda Walk",
                    "Evening",
                    "culture",
                    2,
                    "Take a calm evening walk around the World Peace Pagoda area.",
                    "Lumbini",
                    tags=["culture", "relaxation", "peaceful"],
                    interest_tags=["culture", "relaxation", "spiritual"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow", "balanced"],
                    is_core=True,
                ),
            ],
            experience_activities=[
                make_activity(
                    "Quiet tea and reflection session",
                    "Evening",
                    "relaxation",
                    1.5,
                    "Use extra time for a calm tea break and reflection near the sacred zone.",
                    "Lumbini",
                    tags=["relaxation", "peaceful"],
                    interest_tags=["relaxation", "spiritual"],
                    group_tags=DEFAULT_GROUPS,
                    pace_tags=["slow"],
                    is_optional=True,
                ),
            ],
            travel_tips=[
                "Dress modestly and maintain quiet in spiritual areas.",
                "A bicycle or rickshaw can be useful because the site is large.",
            ],
            transport_notes="Cycle, e-rickshaw, taxi, and short walks are useful within the Lumbini area.",
            accommodation_options={
                "backpacking": ["Basic guesthouse in Lumbini"],
                "budget": ["Budget hotel near the sacred garden"],
                "standard": ["Comfortable hotel in Lumbini"],
                "luxury": ["Premium resort nearby"],
            },
        )
    )

    destinations.append(
        make_trek_destination(
            name="Everest Base Camp",
            region="Khumbu",
            min_days=12,
            recommended_days=14,
            max_days=16,
            altitude_m=5364,
            tags=["trekking", "mountains", "high-altitude", "adventure"],
            travel_tips=[
                "Acclimatize properly and never rush ascent days.",
                "Drink enough water and monitor altitude symptoms carefully.",
                "Mountain flights can be delayed due to weather.",
            ],
            accommodation_options={
                "backpacking": ["Basic teahouse"],
                "budget": ["Standard teahouse"],
                "standard": ["Better lodge where available"],
                "luxury": ["Premium lodge on lower sections where available"],
            },
            trek_template=[
                {"title": "Fly to Lukla and trek to Phakding", "route": "Kathmandu to Lukla flight, then easy trek to Phakding", "overnight": "Phakding", "altitude_m": 2610, "transport": "Flight and trekking", "highlights": ["Lukla flight", "Dudh Koshi valley", "First day on trail"]},
                {"title": "Trek to Namche Bazaar", "route": "Phakding to Namche Bazaar", "overnight": "Namche Bazaar", "altitude_m": 3440, "transport": "Trekking", "highlights": ["Suspension bridges", "Everest region entry", "Sherpa town arrival"]},
                {"title": "Acclimatization in Namche", "route": "Hike to Everest View Hotel and return", "overnight": "Namche Bazaar", "altitude_m": 3440, "transport": "Trekking", "highlights": ["Everest View Hotel", "Acclimatization walk", "Sherpa culture"]},
                {"title": "Trek to Tengboche", "route": "Namche to Tengboche", "overnight": "Tengboche", "altitude_m": 3860, "transport": "Trekking", "highlights": ["Monastery", "Ama Dablam views"]},
                {"title": "Trek to Dingboche", "route": "Tengboche to Dingboche", "overnight": "Dingboche", "altitude_m": 4410, "transport": "Trekking", "highlights": ["Mountain valley landscapes", "Gradual altitude gain"]},
                {"title": "Acclimatization in Dingboche", "route": "Hike high and sleep low", "overnight": "Dingboche", "altitude_m": 4410, "transport": "Trekking", "highlights": ["Acclimatization day", "Viewpoint hike"]},
                {"title": "Trek to Lobuche", "route": "Dingboche to Lobuche", "overnight": "Lobuche", "altitude_m": 4940, "transport": "Trekking", "highlights": ["Khumbu memorial area", "Higher alpine zone"]},
                {"title": "Trek to Gorak Shep and Everest Base Camp", "route": "Lobuche to Gorak Shep, then Everest Base Camp", "overnight": "Gorak Shep", "altitude_m": 5164, "transport": "Trekking", "highlights": ["Everest Base Camp", "Khumbu glacier surroundings"]},
                {"title": "Kala Patthar sunrise and descend to Pheriche", "route": "Early hike, then descend", "overnight": "Pheriche", "altitude_m": 4371, "transport": "Trekking", "highlights": ["Kala Patthar", "Best Everest panorama", "Lower sleeping altitude"]},
                {"title": "Trek to Namche Bazaar", "route": "Pheriche to Namche Bazaar", "overnight": "Namche Bazaar", "altitude_m": 3440, "transport": "Trekking", "highlights": ["Long descent", "Warmer conditions"]},
                {"title": "Trek to Lukla", "route": "Namche to Lukla", "overnight": "Lukla", "altitude_m": 2860, "transport": "Trekking", "highlights": ["Final trekking day", "Trail reflection"]},
                {"title": "Fly to Kathmandu", "route": "Lukla to Kathmandu", "overnight": "Kathmandu", "altitude_m": 1400, "transport": "Flight", "highlights": ["Return flight", "Trip completion"]},
            ],
        )
    )

    destinations.append(
        make_trek_destination(
            name="Annapurna Base Camp",
            region="Annapurna",
            min_days=7,
            recommended_days=10,
            max_days=12,
            altitude_m=4130,
            tags=["trekking", "mountains", "adventure"],
            travel_tips=[
                "Stone stair sections can be tiring, so pace yourself well.",
                "Weather can change quickly in the higher valley.",
            ],
            accommodation_options={
                "backpacking": ["Basic teahouse"],
                "budget": ["Standard teahouse"],
                "standard": ["Better lodge where available"],
            },
            trek_template=[
                {"title": "Drive to trailhead and trek to Tikhedhunga", "route": "Pokhara to Nayapul, then trek", "overnight": "Tikhedhunga", "altitude_m": 1540, "transport": "Drive and trekking", "highlights": ["Riverside trail", "Village sections"]},
                {"title": "Trek to Ghorepani", "route": "Tikhedhunga to Ghorepani", "overnight": "Ghorepani", "altitude_m": 2860, "transport": "Trekking", "highlights": ["Stone steps", "Forest trail"]},
                {"title": "Poon Hill sunrise and trek to Tadapani", "route": "Morning viewpoint then continue", "overnight": "Tadapani", "altitude_m": 2630, "transport": "Trekking", "highlights": ["Poon Hill", "Annapurna panorama"]},
                {"title": "Trek to Chhomrong", "route": "Tadapani to Chhomrong", "overnight": "Chhomrong", "altitude_m": 2170, "transport": "Trekking", "highlights": ["Gurung village", "Stepped route"]},
                {"title": "Trek to Dovan", "route": "Chhomrong to Dovan", "overnight": "Dovan", "altitude_m": 2600, "transport": "Trekking", "highlights": ["Bamboo forest", "River valley"]},
                {"title": "Trek to Machhapuchhre Base Camp", "route": "Dovan to MBC", "overnight": "MBC", "altitude_m": 3700, "transport": "Trekking", "highlights": ["High alpine scenery"]},
                {"title": "Trek to Annapurna Base Camp", "route": "MBC to ABC", "overnight": "ABC", "altitude_m": 4130, "transport": "Trekking", "highlights": ["Annapurna sanctuary", "ABC viewpoint"]},
                {"title": "Descend to Bamboo", "route": "ABC to Bamboo", "overnight": "Bamboo", "altitude_m": 2310, "transport": "Trekking", "highlights": ["Long descent", "Forest return"]},
                {"title": "Trek to Jhinu Danda", "route": "Bamboo to Jhinu Danda", "overnight": "Jhinu Danda", "altitude_m": 1780, "transport": "Trekking", "highlights": ["Hot springs"]},
                {"title": "Trek out and drive to Pokhara", "route": "Jhinu/Nayapul to Pokhara", "overnight": "Pokhara", "altitude_m": 822, "transport": "Trekking and drive", "highlights": ["Return to city comfort"]},
            ],
        )
    )

    destinations.append(
        make_trek_destination(
            name="Langtang Valley Trek",
            region="Langtang",
            min_days=6,
            recommended_days=8,
            max_days=10,
            altitude_m=3870,
            tags=["trekking", "mountains", "culture", "adventure"],
            travel_tips=[
                "This trek combines mountain scenery with Tamang culture.",
                "Road travel to the trailhead can be slow, so start early.",
            ],
            accommodation_options={"backpacking": ["Teahouse"], "budget": ["Standard lodge"]},
            trek_template=[
                {"title": "Drive to Syabrubesi", "route": "Kathmandu to Syabrubesi", "overnight": "Syabrubesi", "altitude_m": 1500, "transport": "Drive", "highlights": ["Foothill road journey"]},
                {"title": "Trek to Lama Hotel", "route": "Syabrubesi to Lama Hotel", "overnight": "Lama Hotel", "altitude_m": 2470, "transport": "Trekking", "highlights": ["Forest trail", "River gorge"]},
                {"title": "Trek to Langtang Village", "route": "Lama Hotel to Langtang Village", "overnight": "Langtang Village", "altitude_m": 3430, "transport": "Trekking", "highlights": ["Open valley", "Mountain views"]},
                {"title": "Trek to Kyanjin Gompa", "route": "Langtang to Kyanjin", "overnight": "Kyanjin Gompa", "altitude_m": 3870, "transport": "Trekking", "highlights": ["Monastery", "Yak pastures"]},
                {"title": "Acclimatization and viewpoint hike", "route": "Kyanjin exploration", "overnight": "Kyanjin Gompa", "altitude_m": 3870, "transport": "Trekking", "highlights": ["High viewpoint", "Glacier scenery"]},
                {"title": "Descend to Lama Hotel", "route": "Kyanjin to Lama Hotel", "overnight": "Lama Hotel", "altitude_m": 2470, "transport": "Trekking", "highlights": ["Descent through valley"]},
                {"title": "Trek to Syabrubesi", "route": "Lama Hotel to Syabrubesi", "overnight": "Syabrubesi", "altitude_m": 1500, "transport": "Trekking", "highlights": ["Final trail day"]},
                {"title": "Drive to Kathmandu", "route": "Syabrubesi to Kathmandu", "overnight": "Kathmandu", "altitude_m": 1400, "transport": "Drive", "highlights": ["Return to city"]},
            ],
        )
    )

    destinations.append(
        make_trek_destination(
            name="Manaslu Circuit",
            region="Manaslu",
            min_days=13,
            recommended_days=15,
            max_days=18,
            altitude_m=5106,
            tags=["trekking", "mountains", "remote", "adventure"],
            travel_tips=[
                "This is a restricted-area trek and usually requires a guide.",
                "Acclimatization before Larkya La is essential.",
            ],
            accommodation_options={"backpacking": ["Teahouse"], "budget": ["Standard teahouse"]},
            trek_template=[
                {"title": "Drive to Maccha Khola", "route": "Kathmandu to Maccha Khola", "overnight": "Maccha Khola", "altitude_m": 900, "transport": "Drive", "highlights": ["River valley road"]},
                {"title": "Trek to Jagat", "route": "Maccha Khola to Jagat", "overnight": "Jagat", "altitude_m": 1410, "transport": "Trekking", "highlights": ["Bridges", "Hot spring area"]},
                {"title": "Trek to Deng", "route": "Jagat to Deng", "overnight": "Deng", "altitude_m": 1800, "transport": "Trekking", "highlights": ["Forest and villages"]},
                {"title": "Trek to Namrung", "route": "Deng to Namrung", "overnight": "Namrung", "altitude_m": 2630, "transport": "Trekking", "highlights": ["Tibetan-influenced settlements"]},
                {"title": "Trek to Lho", "route": "Namrung to Lho", "overnight": "Lho", "altitude_m": 3180, "transport": "Trekking", "highlights": ["Manaslu views"]},
                {"title": "Trek to Samagaon", "route": "Lho to Samagaon", "overnight": "Samagaon", "altitude_m": 3530, "transport": "Trekking", "highlights": ["High mountain culture"]},
                {"title": "Acclimatization in Samagaon", "route": "Explore nearby viewpoints", "overnight": "Samagaon", "altitude_m": 3530, "transport": "Trekking", "highlights": ["Rest and acclimatization"]},
                {"title": "Trek to Samdo", "route": "Samagaon to Samdo", "overnight": "Samdo", "altitude_m": 3860, "transport": "Trekking", "highlights": ["Shorter altitude day"]},
                {"title": "Acclimatization in Samdo", "route": "Hike towards border viewpoint", "overnight": "Samdo", "altitude_m": 3860, "transport": "Trekking", "highlights": ["Acclimatization"]},
                {"title": "Trek to Dharmasala", "route": "Samdo to Dharmasala", "overnight": "Dharmasala", "altitude_m": 4460, "transport": "Trekking", "highlights": ["High camp approach"]},
                {"title": "Cross Larkya La and descend to Bimthang", "route": "Dharmasala to Bimthang via Larkya La", "overnight": "Bimthang", "altitude_m": 3720, "transport": "Trekking", "highlights": ["Larkya La Pass"]},
                {"title": "Trek to Dharapani", "route": "Bimthang to Dharapani", "overnight": "Dharapani", "altitude_m": 1860, "transport": "Trekking", "highlights": ["Big descent"]},
                {"title": "Drive to Kathmandu", "route": "Dharapani/Besisahar to Kathmandu", "overnight": "Kathmandu", "altitude_m": 1400, "transport": "Drive", "highlights": ["Trip completion"]},
            ],
        )
    )

    destinations.append(
        make_trek_destination(
            name="Ghorepani Poon Hill Trek",
            region="Annapurna",
            min_days=4,
            recommended_days=5,
            max_days=6,
            altitude_m=3210,
            tags=["trekking", "mountains", "short trek", "scenic"],
            travel_tips=[
                "This is one of Nepal's best short scenic treks.",
                "Sunrise mornings start very early, so keep warm layers ready.",
            ],
            accommodation_options={"backpacking": ["Teahouse"], "budget": ["Standard lodge"], "luxury": ["Premium lodge where available"]},
            trek_template=[
                {"title": "Drive to Nayapul and trek to Tikhedhunga", "route": "Pokhara to Nayapul, then trek", "overnight": "Tikhedhunga", "altitude_m": 1540, "transport": "Drive and trekking", "highlights": ["Trailhead start"]},
                {"title": "Trek to Ghorepani", "route": "Tikhedhunga to Ghorepani", "overnight": "Ghorepani", "altitude_m": 2860, "transport": "Trekking", "highlights": ["Stone steps", "Forest"]},
                {"title": "Poon Hill sunrise and trek to Ghandruk", "route": "Viewpoint then continue to Ghandruk", "overnight": "Ghandruk", "altitude_m": 1940, "transport": "Trekking", "highlights": ["Sunrise viewpoint", "Gurung village"]},
                {"title": "Trek out and drive to Pokhara", "route": "Ghandruk to Nayapul, then drive", "overnight": "Pokhara", "altitude_m": 822, "transport": "Trekking and drive", "highlights": ["Return to Pokhara"]},
            ],
        )
    )

    city_names = [
        "Patan", "Bhaktapur", "Bandipur", "Gorkha", "Tansen", "Janakpur", "Dharan", "Dhankuta",
        "Ilam", "Hetauda", "Butwal", "Nepalgunj", "Biratnagar", "Besisahar", "Jomsom", "Manang",
        "Bharatpur", "Dhulikhel", "Kirtipur", "Nuwakot", "Bungamati", "Khokana", "Ghandruk",
        "Dhampus", "Bhedetar", "Palpa", "Bajhang", "Damauli", "Siddharthanagar", "Tokha", "Panauti",
        "Namo Buddha", "Kakani", "Pharping", "Charikot", "Jiri", "Lamjung", "Rupakot", "Kahun Danda",
        "Nagarkot"
    ]

    wildlife_names = [
        "Bardia National Park", "Koshi Tappu", "Shivapuri National Park", "Parsa National Park",
        "Shuklaphanta National Park", "Banke National Park"
    ]

    lake_names = [
        "Begnas Lake", "Rupa Lake", "Rara Lake", "Gosaikunda", "Tilicho Lake", "Gokyo Lakes",
        "Shey Phoksundo", "Phewa Lake", "Dudha Pokhari", "Mai Pokhari"
    ]

    adventure_names = [
        "Bhote Koshi", "Trishuli River", "Kushma", "Hattiban", "Bhotekoshi Rafting Zone",
        "Mardi Himal Base Area", "Kalinchowk", "Pathibhara", "Muktinath", "Tatopani"
    ]

    trekking_names = [
        "Mardi Himal Trek", "Upper Mustang Trek", "Helambu Trek", "Tamang Heritage Trail",
        "Mohare Danda Trek", "Pikey Peak Trek", "Khopra Ridge Trek", "Nar Phu Valley Trek",
        "Dhaulagiri Circuit", "Ruby Valley Trek", "Api Base Camp Trek", "Khopra Trek",
        "Ama Yangri Trek", "Annapurna Circuit", "Tilicho Side Trek", "Rupina La Trek"
    ]

    for name in city_names:
        destinations.append(generated_city_destination(name, "Nepal"))

    for name in wildlife_names:
        destinations.append(generated_wildlife_destination(name, "Nepal"))

    for name in lake_names:
        if name == "Rara Lake":
            continue
        destinations.append(generated_lake_destination(name, "Nepal"))

    for name in adventure_names:
        destinations.append(generated_adventure_destination(name, "Nepal"))

    for name in trekking_names:
        if name in {"Upper Mustang Trek"}:
            continue

        destinations.append(
            make_trek_destination(
                name=name,
                region="Nepal Himalaya",
                min_days=5,
                recommended_days=8,
                max_days=12,
                altitude_m=3500,
                tags=["trekking", "mountains", "adventure"],
                travel_tips=[
                    "Prepare for variable mountain weather.",
                    "Keep your pace steady and hydrate regularly.",
                ],
                accommodation_options={
                    "backpacking": ["Basic teahouse"],
                    "budget": ["Standard teahouse"],
                    "standard": ["Better lodge where available"],
                },
                trek_template=[
                    {"title": f"Travel to {name} trailhead", "route": "Reach the trailhead and begin with a light walk", "overnight": "Trailhead village", "altitude_m": 1800, "transport": "Drive and trekking", "highlights": ["Approach day", "Village setting"]},
                    {"title": "Trek to lower camp", "route": "Continue gradually upward", "overnight": "Lower camp", "altitude_m": 2500, "transport": "Trekking", "highlights": ["Forest trail", "River valley"]},
                    {"title": "Trek to high camp or major stop", "route": "Ascend through scenic trail sections", "overnight": "High camp", "altitude_m": 3300, "transport": "Trekking", "highlights": ["Open views", "Mountain route"]},
                    {"title": "Viewpoint or main highlight day", "route": "Reach the key viewpoint or route feature", "overnight": "High camp", "altitude_m": 3800, "transport": "Trekking", "highlights": ["Main trek highlight", "Mountain panorama"]},
                    {"title": "Begin descent", "route": "Descend toward lower settlements", "overnight": "Lower settlement", "altitude_m": 2600, "transport": "Trekking", "highlights": ["Descent", "Changing landscapes"]},
                    {"title": "Exit trek and return", "route": "Finish trekking and travel onward", "overnight": "Gateway town", "altitude_m": 1400, "transport": "Trekking and drive", "highlights": ["Trip completion"]},
                ],
            )
        )

    dedup = {}
    for d in destinations:
        dedup[d["name"]] = d
    destinations = list(dedup.values())
    destinations.sort(key=lambda x: x["name"].lower())

    data = {"destinations": destinations}

    rules = {
        "budget_multipliers": {
            "backpacking": {"accommodation": 0.30, "food": 0.30, "transport": 0.30, "activities": 0.10},
            "budget": {"accommodation": 0.35, "food": 0.30, "transport": 0.20, "activities": 0.15},
            "standard": {"accommodation": 0.40, "food": 0.25, "transport": 0.15, "activities": 0.20},
            "luxury": {"accommodation": 0.55, "food": 0.20, "transport": 0.10, "activities": 0.15},
        }
    }

    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "ai_engine", "data")
    os.makedirs(data_dir, exist_ok=True)

    with open(os.path.join(data_dir, "destinations.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    with open(os.path.join(data_dir, "rules.json"), "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

    print(f"Created {os.path.join(data_dir, 'destinations.json')} with {len(destinations)} destinations")
    print(f"Created {os.path.join(data_dir, 'rules.json')}")


if __name__ == "__main__":
    create_dataset()