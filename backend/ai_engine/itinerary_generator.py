import json
from pathlib import Path
from collections import defaultdict
from copy import deepcopy


class ItineraryEngine:
    def __init__(self):
        base_dir = Path(__file__).resolve().parent
        data_path = base_dir / "data" / "destinations.json"

        with open(data_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        self.destinations = raw.get("destinations", [])
        self.dest_by_name = {
            d.get("name", "").strip().lower(): d
            for d in self.destinations
            if d.get("name")
        }

        self.aliases = {
            "kathmandu": "Kathmandu Valley",
            "kathmandu valley": "Kathmandu Valley",
            "pokhara": "Pokhara",
            "chitwan": "Chitwan National Park",
            "chitwan national park": "Chitwan National Park",
            "ebc": "Everest Base Camp",
            "everest base camp trek": "Everest Base Camp",
            "abc": "Annapurna Base Camp",
            "annapurna base camp trek": "Annapurna Base Camp",
            "ghorepani poon hill": "Ghorepani Poon Hill Trek",
            "bandipur bazaar": "Bandipur",
            "phewa lake": "Pokhara",
        }

    def list_destinations(self):
        out = []
        for d in self.destinations:
            name = d.get("name")
            if name:
                out.append({
                    "name": name,
                    "region": d.get("region", ""),
                    "type": d.get("type", "city"),
                    "min_days": d.get("min_days", 1),
                    "max_days": d.get("max_days", 30),
                    "recommended_days": d.get("recommended_days", 3)
                })
        return out

    def generate_itinerary(self, payload):
        destination_input = (payload.get("destination") or "").strip()
        starting_place = (payload.get("starting_place") or "Kathmandu").strip()
        days = max(1, int(payload.get("days", 3)))
        people = max(1, int(payload.get("people", payload.get("travelers", 1))))
        budget = float(payload.get("budget", 30000))
        interests = self._normalize_list(payload.get("interests", []))
        pace = (payload.get("pace") or "balanced").strip().lower()
        hotel_level = (payload.get("hotel_level") or "standard").strip().lower()
        travel_group = (payload.get("travel_group") or payload.get("group_type") or self._infer_group_type(people)).strip().lower()
        season = (payload.get("season") or "").strip().lower()

        destination_name = self._resolve_destination_name(destination_input)
        start_name = self._resolve_destination_name(starting_place)

        destination = self.dest_by_name.get(destination_name.lower())

        if not destination:
            return {
                "success": False,
                "message": f"Destination '{destination_input}' not found in dataset.",
                "itinerary": []
            }

        dest_type = str(destination.get("type", "")).lower()
        planning_mode = self._get_planning_mode(destination)

        if dest_type == "trekking" and destination.get("trek_template"):
            itinerary = self._build_trek_itinerary(
                destination=destination,
                days=days,
                hotel_level=hotel_level,
                starting_place=start_name
            )
        else:
            itinerary = self._build_hub_itinerary(
                destination=destination,
                days=days,
                budget=budget,
                people=people,
                interests=interests,
                pace=pace,
                hotel_level=hotel_level,
                starting_place=start_name,
                travel_group=travel_group,
                season=season,
                planning_mode=planning_mode
            )

        return {
            "success": True,
            "message": f"Itinerary generated for {destination.get('name')}.",
            "summary": {
                "destination": destination.get("name"),
                "starting_place": starting_place,
                "region": destination.get("region", ""),
                "type": destination.get("type", ""),
                "planning_mode": planning_mode,
                "days": len(itinerary),
                "people": people,
                "budget": budget,
                "hotel_level": hotel_level,
                "pace": pace,
                "travel_group": travel_group,
                "season": season
            },
            "travel_tips": destination.get("travel_tips", []),
            "transport_notes": destination.get("transport_notes", ""),
            "recommended_stay": destination.get("accommodation_options", {}).get(hotel_level, []),
            "itinerary": itinerary
        }

    def _normalize_list(self, value):
        if isinstance(value, str):
            return [value.strip().lower()] if value.strip() else []
        if isinstance(value, list):
            return [str(x).strip().lower() for x in value if str(x).strip()]
        return []

    def _resolve_destination_name(self, name):
        key = name.strip().lower()
        return self.aliases.get(key, name)

    def _infer_group_type(self, people):
        if people <= 1:
            return "solo"
        if people == 2:
            return "couple"
        if people <= 4:
            return "friends"
        return "family"

    def _get_planning_mode(self, destination):
        dest_type = str(destination.get("type", "")).lower()
        tags = set(self._normalize_list(destination.get("tags", [])))
        name = str(destination.get("name", "")).lower()

        if dest_type == "trekking":
            return "trekking"
        if dest_type in {"wildlife"} or "wildlife" in tags:
            return "wildlife"
        if dest_type in {"cultural", "heritage", "spiritual"}:
            return "cultural"
        if dest_type in {"adventure"}:
            return "adventure_hub"
        if "bandipur" in name:
            return "cultural_town"
        if dest_type in {"hill_station", "nature"}:
            return "scenic_relaxed"
        return "city_break"

    # ---------------- TREK MODE ----------------

    def _build_trek_itinerary(self, destination, days, hotel_level, starting_place):
        template = destination.get("trek_template", [])
        if not template:
            return []

        selected = template[:days] if days <= len(template) else template[:]
        while len(selected) < days:
            selected.append(template[-1])

        itinerary = []
        total_days = len(selected)

        for idx, item in enumerate(selected, start=1):
            schedule = []

            if idx == 1 and starting_place.lower() != destination.get("name", "").lower():
                schedule.append({
                    "time": "Morning",
                    "place": f"Route: {starting_place} to Trailhead",
                    "category": "Travel",
                    "details": f"Depart from {starting_place} to reach the gateway of {destination.get('name')}."
                })
                schedule.append({
                    "time": "Afternoon",
                    "place": item.get("overnight", destination.get("name")),
                    "category": "Trekking",
                    "details": self._format_trek_details(item)
                })
            else:
                schedule.append({
                    "time": "Day Plan",
                    "place": item.get("overnight", destination.get("name")),
                    "category": "Trekking",
                    "details": self._format_trek_details(item)
                })

            if idx == total_days:
                schedule.append({
                    "time": "Evening",
                    "place": "Gateway Town / Departure",
                    "category": "Departure",
                    "details": "Conclude the trek. Prepare for onward travel or enjoy a final celebratory dinner."
                })

            itinerary.append({
                "day": idx,
                "theme": self._trek_day_theme(idx, total_days, item),
                "headline": f"Day {idx}: {item.get('title', 'Trek Day')}",
                "schedule": schedule,
                "stay": f"Overnight at {item.get('overnight', 'planned stop')}.",
                "notes": self._build_trek_note(idx, total_days, item)
            })

        return itinerary

    def _format_trek_details(self, item):
        route = item.get("route", "")
        transport = item.get("transport", "")
        altitude = item.get("altitude_m")
        highlights = item.get("highlights", [])

        parts = []
        if route:
            parts.append(f"{route}.")
        if transport:
            parts.append(f"Transport mode: {transport}.")
        if altitude:
            parts.append(f"Sleeping altitude reaches {altitude}m.")
        if highlights:
            parts.append(f"Highlights include: {', '.join(highlights)}.")
        return " ".join(parts)

    def _trek_day_theme(self, day_no, total_days, item):
        title = str(item.get("title", "")).lower()
        if "acclimatization" in title:
            return "Acclimatization and Altitude Management"
        if day_no == 1:
            return "Arrival and Trek Start"
        if day_no == total_days:
            return "Descent and Trip Wrap-up"
        return "Trek Progression"

    def _build_trek_note(self, day_no, total_days, item):
        notes = []
        if day_no == 1:
            notes.append("Keep the first trekking day organized and avoid rushing out of the gate.")
        if "acclimatization" in str(item.get("title", "")).lower():
            notes.append("Use this day properly for acclimatization. Stay active but keep effort controlled.")
        if day_no == total_days:
            notes.append("Keep buffer time for return travel or weather delays.")
        if not notes:
            notes.append("Hydrate well, maintain a steady pace, and monitor your body closely.")
        return " ".join(notes)

    # ---------------- HUB MODE ----------------

    def _build_hub_itinerary(
        self,
        destination,
        days,
        budget,
        people,
        interests,
        pace,
        hotel_level,
        starting_place,
        travel_group,
        season,
        planning_mode
    ):
        budget_tier = self._budget_tier(budget)
        pool = self._collect_professional_pool(
            destination=destination,
            budget_tier=budget_tier,
            interests=interests,
            pace=pace,
            travel_group=travel_group,
            season=season,
            hotel_level=hotel_level,
            planning_mode=planning_mode
        )

        used_titles = set()
        itinerary = []
        total_days = days

        for day_no in range(1, days + 1):
            day_schedule = []
            theme = self._hub_day_theme(day_no, total_days, planning_mode)
            day_kind = self._day_kind(day_no, total_days, planning_mode)

            slots = ["Morning", "Afternoon", "Evening"]

            if day_no == 1 and starting_place.lower() != destination.get("name", "").lower():
                day_schedule.append({
                    "time": "Morning",
                    "place": f"Route from {starting_place} to {destination.get('name')}",
                    "category": "Travel",
                    "details": f"Travel from {starting_place} to {destination.get('name')}, settle into your stay, and keep the remainder of the day light and realistic."
                })
                slots = ["Afternoon", "Evening"]

            if day_no == total_days and day_no != 1:
                slots = ["Morning", "Afternoon"]

            for slot in slots:
                act = self._get_best_activity(
                    pool=pool,
                    slot=slot,
                    used_titles=used_titles,
                    pace=pace,
                    day_kind=day_kind,
                    current_day=day_no,
                    total_days=total_days
                )

                if act:
                    used_titles.add(act["title"])
                    day_schedule.append({
                        "time": slot,
                        "place": act["place"],
                        "category": act["category"].title(),
                        "details": self._format_activity_detail(act)
                    })
                else:
                    day_schedule.append(self._build_smart_fallback(slot, destination, planning_mode, day_no, total_days))

            if day_no == total_days:
                day_schedule.append({
                    "time": "Evening",
                    "place": destination.get("name"),
                    "category": "Departure",
                    "details": f"Check out, keep some margin for transfers, and prepare for onward travel from {destination.get('name')}."
                })

            itinerary.append({
                "day": day_no,
                "theme": theme,
                "headline": f"Day {day_no}: {theme}",
                "schedule": day_schedule,
                "stay": self._stay_text(destination, hotel_level),
                "notes": self._hub_day_note(day_no, total_days, pace, planning_mode)
            })

        return itinerary

    def _collect_professional_pool(
        self,
        destination,
        budget_tier,
        interests,
        pace,
        travel_group,
        season,
        hotel_level,
        planning_mode
    ):
        pool = {"Morning": [], "Afternoon": [], "Evening": []}

        sections = [
            ("activities", destination.get("activities", []), 40),
            ("nearby_day_trips", destination.get("nearby_day_trips", []), 28),
            ("experience_activities", destination.get("experience_activities", []), 24),
        ]

        for source_name, items, base_score in sections:
            for raw_item in items:
                item = deepcopy(raw_item)

                allowed_budget_tiers = self._normalize_list(item.get("cost_tier", []))
                if allowed_budget_tiers and budget_tier not in allowed_budget_tiers:
                    continue

                title = str(item.get("title", "Activity")).strip()
                if not title:
                    continue

                tags = set(self._normalize_list(item.get("tags", [])))
                group_tags = set(self._normalize_list(item.get("group_tags", [])))
                season_tags = set(self._normalize_list(item.get("season_tags", [])))
                pace_tags = set(self._normalize_list(item.get("pace_tags", [])))
                hotel_tags = set(self._normalize_list(item.get("hotel_tags", [])))
                interest_tags = set(self._normalize_list(item.get("interest_tags", []))) or tags

                time_of_day = str(item.get("time_of_day", "Morning")).title()
                if time_of_day not in pool:
                    time_of_day = "Morning"

                score = base_score

                if interest_tags and interests:
                    overlap = len(set(interests).intersection(interest_tags))
                    score += overlap * 12

                if group_tags:
                    if travel_group in group_tags:
                        score += 10
                    else:
                        score -= 4

                if pace_tags:
                    if pace in pace_tags:
                        score += 7
                    else:
                        score -= 2

                if season and season_tags:
                    if season in season_tags:
                        score += 8
                    else:
                        score -= 3

                if hotel_tags and hotel_level in hotel_tags:
                    score += 4

                if item.get("is_core") is True:
                    score += 12
                if item.get("is_optional") is True:
                    score -= 2

                duration_hours = float(item.get("duration_hours", 2) or 2)
                if pace == "slow" and duration_hours > 4:
                    score -= 3
                if pace == "fast" and duration_hours <= 2:
                    score += 2

                score += self._planning_mode_bonus(planning_mode, tags, item.get("category", ""))

                node = {
                    "title": title,
                    "place": item.get("area") or item.get("place") or destination.get("name"),
                    "category": item.get("category", "general"),
                    "duration_hours": duration_hours,
                    "notes": item.get("notes", ""),
                    "score": score,
                    "tags": list(tags),
                    "interest_tags": list(interest_tags),
                    "group_tags": list(group_tags),
                    "pace_tags": list(pace_tags),
                    "season_tags": list(season_tags),
                    "source": source_name,
                    "time_of_day": time_of_day,
                    "is_core": bool(item.get("is_core", False)),
                }

                pool[time_of_day].append(node)

        for slot in pool:
            pool[slot].sort(key=lambda x: (x["score"], x["is_core"]), reverse=True)

        return pool

    def _planning_mode_bonus(self, planning_mode, tags, category):
        category = str(category).lower()
        bonus = 0

        if planning_mode == "wildlife":
            if "wildlife" in tags or category in {"safari", "nature", "wildlife"}:
                bonus += 10
        elif planning_mode == "cultural":
            if "culture" in tags or "heritage" in tags or category in {"culture", "heritage", "temple", "museum"}:
                bonus += 10
        elif planning_mode == "adventure_hub":
            if "adventure" in tags or category in {"adventure", "viewpoint", "hiking"}:
                bonus += 10
        elif planning_mode == "scenic_relaxed":
            if "nature" in tags or "scenic" in tags or category in {"viewpoint", "nature", "leisure"}:
                bonus += 10
        elif planning_mode == "cultural_town":
            if "culture" in tags or "food" in tags or category in {"heritage", "walking", "culture"}:
                bonus += 10
        else:
            if category in {"museum", "market", "walking", "landmark"}:
                bonus += 6

        return bonus

    def _get_best_activity(self, pool, slot, used_titles, pace, day_kind, current_day, total_days):
        exact_candidate = self._pick_from_slot(pool[slot], used_titles, slot, pace, day_kind, strict_slot=True)
        if exact_candidate:
            return exact_candidate

        fallback_order = self._fallback_slot_order(slot)
        for fb_slot in fallback_order:
            candidate = self._pick_from_slot(pool[fb_slot], used_titles, slot, pace, day_kind, strict_slot=False)
            if candidate:
                return candidate

        return None

    def _pick_from_slot(self, items, used_titles, requested_slot, pace, day_kind, strict_slot):
        best_idx = None
        best_score = None

        for idx, act in enumerate(items):
            if act["title"] in used_titles:
                continue

            adjusted = act["score"]

            if strict_slot is False and act.get("time_of_day") != requested_slot:
                adjusted -= 8

            duration = float(act.get("duration_hours", 2) or 2)
            category = str(act.get("category", "")).lower()
            tags = set(act.get("tags", []))

            if requested_slot == "Evening":
                if duration > 3.5:
                    adjusted -= 8
                if category in {"hiking", "viewpoint", "adventure"}:
                    adjusted -= 10

            if requested_slot == "Morning":
                if "sunset" in act["title"].lower():
                    adjusted -= 15

            if requested_slot == "Evening":
                if "sunrise" in act["title"].lower():
                    adjusted -= 15

            if pace == "slow" and duration > 4:
                adjusted -= 5
            if pace == "fast" and duration <= 2:
                adjusted += 2

            if day_kind == "arrival":
                if category in {"adventure", "hiking"} and duration > 3:
                    adjusted -= 10
            elif day_kind == "departure":
                if duration > 3:
                    adjusted -= 8
            elif day_kind == "core":
                if act.get("is_core"):
                    adjusted += 6
            elif day_kind == "extended":
                if act.get("source") in {"experience_activities", "nearby_day_trips"}:
                    adjusted += 4

            if best_score is None or adjusted > best_score:
                best_score = adjusted
                best_idx = idx

        if best_idx is None:
            return None

        return items.pop(best_idx)

    def _fallback_slot_order(self, slot):
        if slot == "Morning":
            return ["Afternoon"]
        if slot == "Afternoon":
            return ["Morning"]
        return ["Afternoon"]

    def _build_smart_fallback(self, slot, destination, planning_mode, day_no, total_days):
        base = destination.get("name", "the destination")

        if planning_mode == "wildlife":
            fallback_map = {
                "Morning": ("Nature Buffer", "Leisure", f"Use the morning for a relaxed nature walk, birdwatching, or slow riverside observation around {base}."),
                "Afternoon": ("Local Village Experience", "Culture", f"Spend time with a light local community or village-side experience near {base}, keeping the day flexible."),
                "Evening": ("Cultural Wind-down", "Leisure", f"Enjoy a calm evening with local cuisine, storytelling, or a gentle cultural program in {base}."),
            }
        elif planning_mode in {"cultural", "cultural_town"}:
            fallback_map = {
                "Morning": ("Heritage Walk", "Culture", f"Take a relaxed self-guided heritage walk through the older quarters of {base}."),
                "Afternoon": ("Café and Courtyard Break", "Leisure", f"Keep the afternoon light with café time, photography, and slow exploration around {base}."),
                "Evening": ("Local Food Evening", "Food", f"Use the evening to enjoy regional dishes and a slow market-side atmosphere in {base}."),
            }
        elif planning_mode == "adventure_hub":
            fallback_map = {
                "Morning": ("Scenic Recovery Time", "Leisure", f"Keep the morning flexible for rest, scenic views, and preparation for the next active block in {base}."),
                "Afternoon": ("Lakeside / Town Exploration", "Leisure", f"Use the afternoon for relaxed walking, cafés, and shopping around {base}."),
                "Evening": ("Sunset and Dinner", "Leisure", f"Spend the evening unwinding with sunset views and dinner in {base}."),
            }
        else:
            fallback_map = {
                "Morning": ("Flexible Exploration", "Leisure", f"Keep the morning open for relaxed exploration around the main area of {base}."),
                "Afternoon": ("Local Experience", "Leisure", f"Spend time exploring local streets, cafés, viewpoints, or markets around {base}."),
                "Evening": ("Free Evening", "Leisure", f"Enjoy a flexible evening in {base} with food, walking, and rest."),
            }

        place, category, details = fallback_map.get(slot, ("Free Time", "Leisure", f"Relax around {base}."))
        return {
            "time": slot,
            "place": place,
            "category": category,
            "details": details
        }

    def _format_activity_detail(self, act):
        title = act.get("title", "Activity")
        place = act.get("place", "Main Area")
        notes = act.get("notes", "")
        duration = act.get("duration_hours", 2)

        details = f"{title} at {place}."
        if notes:
            details += f" {notes}"
        details += f" (Approx. {duration:g} hrs)"
        return details

    def _budget_tier(self, budget):
        if budget < 20000:
            return "backpacking"
        if budget < 50000:
            return "budget"
        if budget < 120000:
            return "standard"
        return "luxury"

    def _day_kind(self, day_no, total_days, planning_mode):
        if total_days == 1:
            return "arrival_departure"
        if day_no == 1:
            return "arrival"
        if day_no == total_days:
            return "departure"
        if day_no == 2:
            return "core"
        if day_no >= 3:
            return "extended"
        return "core"

    def _hub_day_theme(self, day_no, total_days, planning_mode):
        if total_days == 1:
            return "Main Highlights Summary"

        if day_no == 1:
            if planning_mode == "wildlife":
                return "Arrival and Jungle-Side Orientation"
            if planning_mode in {"cultural", "cultural_town"}:
                return "Arrival and Heritage Introduction"
            if planning_mode == "adventure_hub":
                return "Arrival and Scenic Orientation"
            return "Arrival and Initial Immersion"

        if day_no == total_days:
            return "Final Explorations and Wrapping Up"

        theme_sets = {
            "wildlife": [
                "Core Safari and Nature Experiences",
                "River, Forest, and Local Culture Balance",
                "Extended Wildlife and Slow Exploration",
            ],
            "cultural": [
                "Sacred and Heritage Highlights",
                "Deep Dive into Local Culture",
                "Hidden Corners and Local Rhythms",
            ],
            "cultural_town": [
                "Main Bazaar and Heritage Discovery",
                "Slow Travel Through Local Character",
                "Food, Views, and Cultural Texture",
            ],
            "adventure_hub": [
                "Adventure and Viewpoint Highlights",
                "Nature, Activity, and Recovery Balance",
                "Broadening the Horizon",
            ],
            "scenic_relaxed": [
                "Scenic Highlights and Slow Exploration",
                "Nature, Views, and Local Rhythm",
                "Restful Discovery and Hidden Corners",
            ],
            "city_break": [
                "Core Attractions Discovery",
                "Deep Dive: Culture and Nature",
                "Broadening the Horizon",
            ],
        }

        themes = theme_sets.get(planning_mode, theme_sets["city_break"])
        return themes[(day_no - 2) % len(themes)]

    def _stay_text(self, destination, hotel_level):
        options = destination.get("accommodation_options", {}).get(hotel_level, [])
        if options:
            return f"Check in to: {options[0]} (or similar level)."
        return f"Stay in the heart of {destination.get('name')}."

    def _hub_day_note(self, day_no, total_days, pace, planning_mode):
        notes = []

        if day_no == 1:
            notes.append("Keep the first day flexible to accommodate arrival, check-in, and settling in.")
        if day_no == total_days:
            notes.append("Leave buffer time for checkout, transfers, and last-minute shopping.")
        if planning_mode == "wildlife":
            notes.append("Start earlier for wildlife-heavy blocks and keep noise low in nature zones.")
        elif planning_mode in {"cultural", "cultural_town"}:
            notes.append("Group nearby heritage stops together and leave room for unplanned local discoveries.")
        elif planning_mode == "adventure_hub":
            notes.append("Balance active blocks with lighter recovery time so the trip does not feel rushed.")

        if pace == "slow":
            notes.append("Keep a relaxed pace and feel free to skip one non-essential activity if needed.")
        elif pace == "fast":
            notes.append("Start early and minimize long breaks to cover more ground efficiently.")

        if not notes:
            notes.append("Group nearby visits together to reduce transit time within the destination.")

        return " ".join(notes)