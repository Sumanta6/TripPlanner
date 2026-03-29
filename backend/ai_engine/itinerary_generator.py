import json
import re
from pathlib import Path
from collections import defaultdict
from copy import deepcopy
from difflib import get_close_matches


class ItineraryEngine:
    GENERIC_TREK_TITLES = {
        "travel to trailhead",
        "travel to trek trailhead",
        "trek to lower camp",
        "trek to high camp or major stop",
        "viewpoint or main highlight day",
        "begin descent",
        "exit trek and return",
    }
    GENERIC_TREK_OVERNIGHTS = {
        "trailhead village",
        "lower camp",
        "high camp",
        "lower settlement",
        "gateway town",
    }

    def __init__(self):
        base_dir = Path(__file__).resolve().parent
        data_path = base_dir / "data" / "destinations.json"

        with open(data_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        self.destinations = raw.get("destinations", [])
        self.supported_destinations = [
            destination for destination in self.destinations
            if self._is_supported_destination(destination)
        ]
        self.dest_by_name = {
            d.get("name", "").strip().lower(): d
            for d in self.supported_destinations
            if d.get("name")
        }

        alias_source = {
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
            "lo manthang": "Lo Manthang",
            "lomanthang": "Lo Manthang",
            "lo-manthang": "Lo Manthang",
        }
        self.dest_by_normalized_name = {
            self._normalize_name(d.get("name", "")): d
            for d in self.supported_destinations
            if d.get("name")
        }
        self.aliases = {
            self._normalize_name(key): value
            for key, value in alias_source.items()
            if value.lower() in self.dest_by_name
        }

    def list_destinations(self):
        out = []
        for d in self.supported_destinations:
            name = d.get("name")
            if name:
                template = d.get("trek_template", [])
                max_days = d.get("max_days", 30)
                recommended_days = d.get("recommended_days", 3)
                if template:
                    max_days = min(max_days, len(template))
                    recommended_days = min(recommended_days, len(template))
                out.append({
                    "name": name,
                    "region": d.get("region", ""),
                    "type": d.get("type", "city"),
                    "min_days": d.get("min_days", 1),
                    "max_days": max_days,
                    "recommended_days": recommended_days,
                    "aliases": sorted(
                        key for key, value in self.aliases.items()
                        if value == name
                    )
                })
        return sorted(out, key=lambda item: item["name"].lower())

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

        destination_name, destination = self.resolve_destination(destination_input)
        start_name = self._resolve_destination_name(starting_place)

        if not destination:
            return {
                "success": False,
                "message": f"'{destination_input}' is not available in the planner dataset yet.",
                "suggestions": self.suggest_destinations(destination_input),
                "itinerary": []
            }

        dest_type = str(destination.get("type", "")).lower()
        planning_mode = self._get_planning_mode(destination)

        if dest_type == "trekking" and destination.get("trek_template"):
            days = min(days, len(destination.get("trek_template", [])))
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

    def _normalize_name(self, value):
        normalized = re.sub(r"[^a-z0-9]+", " ", str(value or "").strip().lower())
        return " ".join(normalized.split())

    def _resolve_destination_name(self, name):
        resolved_name, _ = self.resolve_destination(name)
        return resolved_name or name

    def resolve_destination(self, name):
        key = self._normalize_name(name)
        if not key:
            return "", None

        alias_match = self.aliases.get(key)
        if alias_match:
            destination = self.dest_by_name.get(alias_match.lower())
            if destination:
                return destination.get("name", alias_match), destination

        destination = self.dest_by_normalized_name.get(key)
        if destination:
            return destination.get("name", name), destination

        return name, None

    def suggest_destinations(self, name, limit=5):
        key = self._normalize_name(name)
        if not key:
            return []

        suggestions = []

        for alias_key, resolved_name in self.aliases.items():
            if key in alias_key or alias_key in key:
                suggestions.append(resolved_name)

        for destination in self.supported_destinations:
            destination_name = destination.get("name", "")
            normalized_name = self._normalize_name(destination_name)
            region = self._normalize_name(destination.get("region", ""))

            if key in normalized_name or normalized_name in key:
                suggestions.append(destination_name)
            elif key and region and key in region:
                suggestions.append(destination_name)

        suggestion_pool = list({
            destination.get("name", "")
            for destination in self.supported_destinations
            if destination.get("name")
        })
        close_matches = get_close_matches(
            key,
            [self._normalize_name(item) for item in suggestion_pool],
            n=limit,
            cutoff=0.55,
        )
        for match in close_matches:
            destination = self.dest_by_normalized_name.get(match)
            if destination:
                suggestions.append(destination.get("name", ""))

        deduped = []
        seen = set()
        for item in suggestions:
            normalized = self._normalize_name(item)
            if item and normalized not in seen:
                deduped.append(item)
                seen.add(normalized)

        return deduped[:limit]

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

        selected = template[: min(days, len(template))]

        itinerary = []
        total_days = len(selected)
        trek_name = destination.get("name", "the trek")

        for idx, item in enumerate(selected, start=1):
            schedule = []
            route = item.get("route", "")
            overnight = item.get("overnight", destination.get("name"))
            altitude = item.get("altitude_m")
            highlights = item.get("highlights", [])
            previous_stop = selected[idx - 2].get("overnight") if idx > 1 else starting_place
            next_stop = selected[idx].get("overnight") if idx < total_days else None
            transport_category = self._trek_transport_category(item)

            if idx == 1 and starting_place.lower() != destination.get("name", "").lower():
                schedule.append({
                    "time": "Morning",
                    "place": f"Route: {starting_place} to Trailhead",
                    "category": "Travel",
                    "details": (
                        f"Leave {starting_place} early and travel toward the trailhead for {trek_name}. "
                        f"Use this first block to organize permits, bags, and timing so the walking section starts without a rush."
                    ),
                    "route": f"{starting_place} to trek gateway",
                    "highlights": ["Road transfer", "Trail preparation"],
                })
                schedule.append({
                    "time": "Afternoon",
                    "place": overnight,
                    "category": transport_category,
                    "details": self._format_trek_details(item, "afternoon", previous_stop, next_stop),
                    "route": route,
                    "highlights": highlights,
                    "altitude_m": altitude,
                })
            else:
                schedule.append({
                    "time": "Morning",
                    "place": previous_stop or overnight,
                    "category": "Route",
                    "details": self._trek_morning_detail(item, previous_stop, overnight, altitude, idx, total_days),
                    "route": route,
                    "highlights": highlights[:2],
                    "altitude_m": altitude,
                })
                schedule.append({
                    "time": "Afternoon",
                    "place": overnight,
                    "category": transport_category,
                    "details": self._format_trek_details(item, "afternoon", previous_stop, next_stop),
                    "route": route,
                    "highlights": highlights,
                    "altitude_m": altitude,
                })

            if idx < total_days:
                schedule.append({
                    "time": "Evening",
                    "place": overnight,
                    "category": "Overnight",
                    "details": self._trek_evening_detail(overnight, altitude, idx, total_days, highlights),
                    "highlights": highlights[-2:] if highlights else [],
                    "altitude_m": altitude,
                })

            if idx == total_days:
                schedule.append({
                    "time": "Evening",
                    "place": "Gateway Town / Departure",
                    "category": "Departure",
                    "details": (
                        f"Wrap up the trek cleanly after arrival in {overnight}, confirm onward transport, and leave a little margin for weather or road timing before the next transfer."
                    ),
                    "route": f"{overnight} onward transfer",
                })

            itinerary.append({
                "day": idx,
                "theme": self._trek_day_theme(idx, total_days, item),
                "headline": f"Day {idx}: {self._trek_day_headline(item, previous_stop, overnight, idx, total_days)}",
                "schedule": schedule,
                "stay": "" if idx == total_days else f"Overnight at {overnight}.",
                "notes": self._build_trek_note(idx, total_days, item),
                "route": route,
                "highlights": highlights,
                "altitude_m": altitude,
            })

        return itinerary

    def _format_trek_details(self, item, slot, previous_stop, next_stop):
        route = item.get("route", "")
        transport = item.get("transport", "")
        altitude = item.get("altitude_m")
        highlights = item.get("highlights", [])
        overnight = item.get("overnight", "planned stop")
        title = item.get("title", "trek stage")

        parts = []
        if route:
            parts.append(
                f"Follow the route from {previous_stop or 'the previous stop'} to {overnight} via {route}, keeping the day's progression natural rather than forcing long idle stops."
            )
        if transport:
            parts.append(
                f"This section is mainly handled by {transport.lower()}, so manage the day around connection timing, trail rhythm, and realistic breaks."
            )
        elif "acclimatization" in title.lower():
            parts.append(
                f"Treat this as an acclimatization-focused stage around {overnight}, keeping the body active with a higher walk before returning to sleep at the same altitude."
            )
        else:
            parts.append(
                f"Keep a steady trekking pace from {previous_stop or 'the previous stop'} toward {overnight}, letting the terrain and altitude shape the rhythm of the day."
            )
        if altitude:
            parts.append(
                f"The overnight altitude is around {altitude}m, so hydrate well, keep the effort even, and pay attention to how your body responds to the gain or descent."
            )
        if highlights:
            parts.append(f"Key highlights along this section include {', '.join(highlights)}.")
        if next_stop:
            parts.append(f"Arriving in {overnight} with time in hand sets up the move toward {next_stop} more comfortably for tomorrow.")
        return " ".join(parts)

    def _trek_morning_detail(self, item, previous_stop, overnight, altitude, idx, total_days):
        title = item.get("title", "Trek section")
        route = item.get("route", "")
        highlights = item.get("highlights", [])
        highlight_text = ", ".join(highlights[:2])
        if idx == total_days:
            return (
                f"Leave {previous_stop or 'the overnight stop'} with the final descent or exit leg clearly in mind, keeping the pace steady so the move toward {overnight} feels controlled rather than rushed. "
                f"{f'Today follows {route}. ' if route else ''}"
                f"Use the last trail hours to enjoy the changing landscape and finish the route cleanly."
            )
        if "acclimatization" in title.lower():
            return (
                f"Start from {previous_stop or overnight} on a lighter but purposeful acclimatization outing, gaining extra height before returning to sleep at {overnight}. "
                f"{f'The route focus is {route}. ' if route else ''}"
                f"{f'Look out for {highlight_text} as the landscape opens up.' if highlights else 'Keep the effort conversational and let altitude adaptation remain the priority.'}"
            )
        return (
            f"Set out from {previous_stop or 'the overnight stop'} and begin the day's progression toward {overnight}. "
            f"This stage works best with an early, even pace while trail conditions are still fresh. "
            f"{f'The route today trends toward about {altitude}m. ' if altitude else ''}"
            f"{f'Expect defining sections such as {highlight_text}.' if highlights else ''}"
        ).strip()

    def _trek_evening_detail(self, overnight, altitude, idx, total_days, highlights):
        if idx == total_days:
            return f"After reaching {overnight}, use the evening to rest, sort gear, and enjoy a quieter finish to the trek before onward travel."
        highlight_note = f" Nearby highlights often include {', '.join(highlights[:2])}." if highlights else ""
        altitude_note = f" At around {altitude}m, keep the evening simple, warm, and recovery-focused." if altitude else ""
        return f"Settle in at {overnight} for the night and use the remaining time for tea, a warm meal, and trail recovery.{highlight_note}{altitude_note}"

    def _trek_day_theme(self, day_no, total_days, item):
        title = str(item.get("title", "")).lower()
        if "acclimatization" in title:
            return "Acclimatization and Altitude Management"
        if "base camp" in title or "viewpoint" in title or "sunrise" in title:
            return "Main Highlight Stage"
        if day_no == 1:
            return "Arrival and Trek Start"
        if day_no == total_days:
            return "Descent and Trip Wrap-up"
        if any(word in title for word in ("descend", "return")):
            return "Descent Through the Lower Valley"
        return "Route Progression and Mountain Trail"

    def _trek_day_headline(self, item, previous_stop, overnight, idx, total_days):
        title = str(item.get("title", "")).strip()

        if self._is_generic_trek_stage(item):
            if idx == 1:
                return f"Approach to {overnight}"
            if idx == total_days:
                return f"Return from {previous_stop or 'the trail'} to {overnight}"
            if previous_stop and overnight and previous_stop != overnight:
                return f"{previous_stop} to {overnight}"
            return f"Trail stage around {overnight}"

        if previous_stop and overnight and previous_stop != overnight and " to " not in title.lower():
            return f"{title}: {previous_stop} to {overnight}"
        return title or f"Trek stage to {overnight}"

    def _trek_transport_category(self, item):
        transport = str(item.get("transport", "")).lower()
        title = str(item.get("title", "")).lower()
        if "acclimatization" in title:
            return "Acclimatization"
        if "trek" in transport and ("drive" in transport or "flight" in transport):
            return "Travel and Trekking"
        if "flight" in transport:
            return "Flight"
        if "drive" in transport or "jeep" in transport or "bus" in transport:
            return "Travel"
        return "Trekking"

    def _build_trek_note(self, day_no, total_days, item):
        notes = []
        altitude = item.get("altitude_m")
        route = item.get("route", "")
        highlights = item.get("highlights", [])
        if day_no == 1:
            notes.append("Keep the first trekking day organized and avoid rushing out of the gate.")
        if "acclimatization" in str(item.get("title", "")).lower():
            notes.append("Use this day properly for acclimatization. Stay active but keep effort controlled.")
        if day_no == total_days:
            notes.append("Keep buffer time for return travel or weather delays.")
        if altitude and altitude >= 3000:
            notes.append("Eat early, stay warm, and keep hydration consistent once you are sleeping above 3000m.")
        if route:
            notes.append(f"Route context: {route}.")
        if highlights:
            notes.append(f"Watch for {', '.join(highlights[:2])} as signature moments of the day.")
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
        destination_name = destination.get("name", "the destination")
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
        prior_places = []

        for day_no in range(1, days + 1):
            day_schedule = []
            theme = self._hub_day_theme(day_no, total_days, planning_mode)
            day_kind = self._day_kind(day_no, total_days, planning_mode)
            route_context = self._day_route_context(destination, day_no, total_days, planning_mode, prior_places)

            slots = ["Morning", "Afternoon", "Evening"]

            if day_no == 1 and starting_place.lower() != destination.get("name", "").lower():
                day_schedule.append({
                    "time": "Morning",
                    "place": f"Route from {starting_place} to {destination_name}",
                    "category": "Travel",
                    "details": self._arrival_transition_detail(
                        destination=destination,
                        starting_place=starting_place,
                        day_kind=day_kind,
                    )
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
                    total_days=total_days,
                    prior_places=prior_places,
                )

                if act:
                    used_titles.add(act["title"])
                    prior_places.append(str(act["place"]))
                    day_schedule.append({
                        "time": slot,
                        "place": act["place"],
                        "category": act["category"].title(),
                        "details": self._format_activity_detail(
                            act=act,
                            destination=destination,
                            slot=slot,
                            day_no=day_no,
                            total_days=total_days,
                            route_context=route_context,
                            planning_mode=planning_mode,
                        )
                    })
                else:
                    fallback = self._build_smart_fallback(
                        slot, destination, planning_mode, day_no, total_days, route_context
                    )
                    prior_places.append(str(fallback["place"]))
                    day_schedule.append(fallback)

            if day_no == total_days:
                day_schedule.append({
                    "time": "Evening",
                    "place": destination_name,
                    "category": "Departure",
                    "details": self._departure_detail(destination, route_context)
                })

            itinerary.append({
                "day": day_no,
                "theme": theme,
                "headline": f"Day {day_no}: {self._day_headline(destination, theme, day_no, total_days, route_context)}",
                "schedule": day_schedule,
                "stay": self._stay_text(destination, hotel_level, route_context),
                "notes": self._hub_day_note(day_no, total_days, pace, planning_mode, route_context, destination)
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

    def _get_best_activity(self, pool, slot, used_titles, pace, day_kind, current_day, total_days, prior_places):
        exact_candidate = self._pick_from_slot(
            pool[slot], used_titles, slot, pace, day_kind, prior_places, strict_slot=True
        )
        if exact_candidate:
            return exact_candidate

        fallback_order = self._fallback_slot_order(slot)
        for fb_slot in fallback_order:
            candidate = self._pick_from_slot(
                pool[fb_slot], used_titles, slot, pace, day_kind, prior_places, strict_slot=False
            )
            if candidate:
                return candidate

        return None

    def _pick_from_slot(self, items, used_titles, requested_slot, pace, day_kind, prior_places, strict_slot):
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
            normalized_place = str(act.get("place", "")).strip().lower()

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

            if prior_places:
                same_place_count = sum(1 for place in prior_places[-4:] if place.strip().lower() == normalized_place)
                adjusted -= same_place_count * 5

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

    def _build_smart_fallback(self, slot, destination, planning_mode, day_no, total_days, route_context):
        base = destination.get("name", "the destination")

        if planning_mode == "wildlife":
            fallback_map = {
                "Morning": ("Nature Buffer", "Leisure", f"Use the morning for a soft-paced observation walk around {route_context}, when wildlife movement and the light are usually better. Keep voices low and let the landscape set the rhythm."),
                "Afternoon": ("Local Village Experience", "Culture", f"Spend the afternoon around {route_context} with a lighter local interaction, keeping travel time realistic and leaving room for rest between core safari blocks."),
                "Evening": ("Cultural Wind-down", "Leisure", f"Ease into the evening in {route_context} with local food, conversation, and a slower pace after the main wildlife window has closed."),
            }
        elif planning_mode in {"cultural", "cultural_town"}:
            fallback_map = {
                "Morning": ("Heritage Walk", "Culture", f"Start with a slower heritage walk around {route_context}, when courtyards, shrines, and local lanes are calmer and easier to appreciate with context."),
                "Afternoon": ("Café and Courtyard Break", "Leisure", f"Keep the afternoon lighter around {route_context} with photography, café time, and space for small local discoveries that do not need a rigid schedule."),
                "Evening": ("Local Food Evening", "Food", f"Use the evening to lean into regional food and local atmosphere in {route_context}, when streets usually feel more social and relaxed."),
            }
        elif planning_mode == "adventure_hub":
            fallback_map = {
                "Morning": ("Scenic Recovery Time", "Leisure", f"Keep the morning flexible around {route_context} for recovery, a viewpoint stop, and a measured build-up before the next more active segment."),
                "Afternoon": ("Lakeside / Town Exploration", "Leisure", f"Use the afternoon for easier exploration around {route_context}, balancing movement with downtime so the trip still feels enjoyable rather than over-packed."),
                "Evening": ("Sunset and Dinner", "Leisure", f"Spend the evening winding down in {route_context} with sunset views, dinner, and time to reset for the next day."),
            }
        else:
            fallback_map = {
                "Morning": ("Flexible Exploration", "Leisure", f"Keep the morning open around {route_context} for a relaxed but purposeful exploration block that can absorb weather, pace, and local timing changes."),
                "Afternoon": ("Local Experience", "Leisure", f"Spend the afternoon exploring local streets, viewpoints, cafés, or markets around {route_context}, keeping the route practical and easy to follow."),
                "Evening": ("Free Evening", "Leisure", f"Enjoy a slower evening in {route_context} with food, a short walk, and enough downtime to keep the itinerary balanced."),
            }

        place, category, details = fallback_map.get(slot, ("Free Time", "Leisure", f"Relax around {base}."))
        return {
            "time": slot,
            "place": place,
            "category": category,
            "details": details
        }

    def _format_activity_detail(self, act, destination, slot, day_no, total_days, route_context, planning_mode):
        title = act.get("title", "Activity")
        place = act.get("place", "Main Area")
        notes = act.get("notes", "")
        duration = act.get("duration_hours", 2)
        category = str(act.get("category", "")).lower()

        opening = self._activity_opening(slot, title, place, route_context, planning_mode)
        practical = self._practical_detail(slot, duration, place, category, day_no, total_days)
        local_tip = self._local_guide_tip(destination, place, category, slot, planning_mode)

        details = opening
        if notes:
            details += f" {notes}"
        details += f" {practical}"
        if local_tip:
            details += f" {local_tip}"
        return details.strip()

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

    def _stay_text(self, destination, hotel_level, route_context):
        options = destination.get("accommodation_options", {}).get(hotel_level, [])
        if options:
            return f"Overnight in {route_context} at {options[0]} or a similar stay that matches the selected comfort level."
        return f"Overnight around {route_context}, staying close to the next day's core route."

    def _hub_day_note(self, day_no, total_days, pace, planning_mode, route_context, destination):
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
        elif planning_mode == "scenic_relaxed":
            notes.append("Keep the day paced around viewpoints and slower local stops so the scenery remains the main focus.")

        if pace == "slow":
            notes.append("Keep a relaxed pace and feel free to skip one non-essential activity if needed.")
        elif pace == "fast":
            notes.append("Start early and minimize long breaks to cover more ground efficiently.")

        region = destination.get("region")
        if region:
            notes.append(f"Today's route stays centered on the {region} rhythm around {route_context}, so try to keep transfers clustered rather than criss-crossing.")

        if not notes:
            notes.append("Group nearby visits together to reduce transit time within the destination.")

        return " ".join(notes)

    def _day_route_context(self, destination, day_no, total_days, planning_mode, prior_places):
        recent_places = [place for place in prior_places[-3:] if place]
        if recent_places:
            return recent_places[-1]

        if planning_mode == "wildlife":
            return destination.get("gateway_area") or destination.get("name")
        if day_no == 1:
            return destination.get("name")
        return destination.get("region") or destination.get("name")

    def _day_headline(self, destination, theme, day_no, total_days, route_context):
        if day_no == 1:
            return f"{theme} in {destination.get('name')}"
        if day_no == total_days:
            return f"{theme} around {route_context}"
        return f"{theme} via {route_context}"

    def _arrival_transition_detail(self, destination, starting_place, day_kind):
        destination_name = destination.get("name", "the destination")
        region = destination.get("region", "the region")
        return (
            f"Travel from {starting_place} into {destination_name} and use the first leg to settle into the {region} rhythm. "
            f"Keep arrival logistics realistic, leave a little recovery margin after the transfer, and save the heavier exploration for later in the day."
        )

    def _departure_detail(self, destination, route_context):
        return (
            f"Wrap up in {route_context}, leaving enough time for checkout, transfer coordination, and any final local stop before departing {destination.get('name')}."
        )

    def _activity_opening(self, slot, title, place, route_context, planning_mode):
        if slot == "Morning":
            return f"Begin the day with {title} around {place}, a strong fit for the morning window while the route around {route_context} is still fresh and manageable."
        if slot == "Afternoon":
            return f"Continue into the afternoon with {title} around {place}, linking naturally from the earlier block without forcing unnecessary backtracking."
        return f"Close the day with {title} in {place}, keeping the tone suited to an evening pace around {route_context}."

    def _practical_detail(self, slot, duration, place, category, day_no, total_days):
        duration_text = f"Expect roughly {duration:g} hour{'s' if duration != 1 else ''} for this block"
        if slot == "Morning":
            timing_note = "including transfer and orientation time once the day gets moving"
        elif slot == "Afternoon":
            timing_note = "with enough margin for a meal break and route transition"
        else:
            timing_note = "before returning for dinner and overnight downtime"

        category_notes = {
            "culture": "Take time to notice local context rather than rushing between photo stops.",
            "heritage": "These heritage-heavy hours work best when you move at a measured walking pace.",
            "wildlife": "Keep movement quiet and flexible because sightings can shift quickly.",
            "nature": "Weather and visibility can shape the experience, so keep some flexibility.",
            "adventure": "A short buffer helps if equipment checks or conditions slow the start.",
            "food": "Aim for the local specialty window rather than treating this like a quick stop.",
        }

        return f"{duration_text} {timing_note}. {category_notes.get(category, f'This block keeps the day flowing naturally around {place}.')}"

    def _local_guide_tip(self, destination, place, category, slot, planning_mode):
        region = destination.get("region", "")
        if slot == "Morning" and category in {"nature", "wildlife", "viewpoint", "adventure"}:
            return "Starting earlier usually gives cleaner light, calmer routes, and a better overall experience."
        if slot == "Evening" and category in {"food", "culture", "heritage"}:
            return "Evening is often the better time to feel the social atmosphere and local dining rhythm."
        if planning_mode in {"cultural", "cultural_town"}:
            return f"If you enter shrines, monasteries, or family-run spaces around {place}, dress modestly and move with patience."
        if planning_mode == "wildlife":
            return f"In the {region or place} zone, neutral colors and quieter movement usually work better than trying to chase sightings."
        if planning_mode == "adventure_hub":
            return "Keep a small weather margin in mind, especially if viewpoints or outdoor activity timings shift."
        return ""

    def _is_generic_trek_stage(self, item):
        title = self._normalize_name(item.get("title", ""))
        overnight = self._normalize_name(item.get("overnight", ""))
        return title in self.GENERIC_TREK_TITLES or overnight in self.GENERIC_TREK_OVERNIGHTS

    def _has_structured_trek_template(self, destination):
        template = destination.get("trek_template", [])
        if len(template) < 3:
            return False

        for item in template:
            if not item.get("title") or not item.get("overnight") or not item.get("route"):
                return False
            if self._is_generic_trek_stage(item):
                return False
        return True

    def _is_supported_destination(self, destination):
        if not destination or not destination.get("name"):
            return False

        has_duration = (
            destination.get("min_days") is not None
            and destination.get("max_days") is not None
            and destination.get("recommended_days") is not None
        )
        has_itinerary_structure = any(
            destination.get(key)
            for key in ("trek_template", "activities", "nearby_day_trips", "experience_activities")
        )
        if str(destination.get("type", "")).lower() == "trekking":
            has_itinerary_structure = self._has_structured_trek_template(destination)
        return has_duration and has_itinerary_structure
