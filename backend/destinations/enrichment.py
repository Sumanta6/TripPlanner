import hashlib


CURATED_DESTINATION_DATA = {
    "kathmandu": {
        "image_url": "/images/dest-temple.jpg",
        "short_description": "Nepal's capital layers royal squares, living temples, local cuisine, and easy access to surrounding heritage sites.",
        "best_for": ["Culture", "Food", "Flexible city breaks"],
        "recommended_days": 4,
        "highlights": ["Kathmandu Durbar Square", "Swayambhunath", "Thamel evenings"],
        "popularity_score": 95,
    },
    "lalitpur": {
        "image_url": "/images/dest-patan.jpg",
        "short_description": "Lalitpur blends Newari craftsmanship, sacred courtyards, and a polished old-city atmosphere just south of Kathmandu.",
        "best_for": ["Architecture", "Culture", "Art walks"],
        "recommended_days": 3,
        "highlights": ["Patan Durbar Square", "Golden Temple", "Traditional artisan lanes"],
        "popularity_score": 90,
    },
    "bhaktapur": {
        "image_url": "/images/dest-bhaktapur.jpg",
        "short_description": "Bhaktapur delivers a concentrated heritage experience of carved temples, brick alleys, pottery squares, and festival energy.",
        "best_for": ["Heritage", "Photography", "Short cultural escapes"],
        "recommended_days": 2,
        "highlights": ["Bhaktapur Durbar Square", "Pottery Square", "Nyatapola Temple"],
        "popularity_score": 91,
    },
    "pokhara": {
        "image_url": "/images/dest-phewa.jpg",
        "short_description": "Pokhara mixes lakefront calm with adventure access, making it one of Nepal's strongest all-round bases.",
        "best_for": ["Adventure", "Lakeside stays", "Couples"],
        "recommended_days": 4,
        "highlights": ["Phewa Lake", "Sarangkot sunrise", "Annapurna gateway"],
        "popularity_score": 97,
    },
    "lumbini": {
        "image_url": "/images/dest-lumbini.jpg",
        "short_description": "Lumbini is Nepal's major pilgrimage center, anchored by monastic zones, reflective gardens, and Buddhist history.",
        "best_for": ["Pilgrimage", "Reflection", "History"],
        "recommended_days": 2,
        "highlights": ["Maya Devi Temple", "Monastic Zone", "Sacred Garden"],
        "popularity_score": 88,
    },
    "bharatpur": {
        "image_url": "/images/dest-chitwan.jpg",
        "short_description": "Bharatpur works as a practical Chitwan gateway with urban services and quick access to wildlife experiences.",
        "best_for": ["Wildlife base", "Families", "Road access"],
        "recommended_days": 3,
        "highlights": ["Chitwan access", "Rapti riverside", "City convenience"],
        "popularity_score": 83,
    },
    "namche bazar": {
        "image_url": "/images/dest-everest.jpg",
        "short_description": "Namche Bazar is the essential acclimatization and logistics hub for Khumbu treks beneath Everest.",
        "best_for": ["Trekking", "Acclimatization", "Mountain views"],
        "recommended_days": 3,
        "highlights": ["Everest viewpoints", "Sherpa culture", "Trail-side cafés"],
        "popularity_score": 93,
    },
    "lukla": {
        "image_url": "/images/dest-everest.jpg",
        "short_description": "Lukla is the high-energy air gateway for Everest-region trekking routes and fast mountain transitions.",
        "best_for": ["Trekking starts", "Adventure logistics", "Khumbu access"],
        "recommended_days": 2,
        "highlights": ["Mountain airport arrival", "Trail departure point", "Khumbu route access"],
        "popularity_score": 89,
    },
    "mustang": {
        "image_url": "/images/dest-mustang.jpg",
        "short_description": "Mustang opens into a dramatic trans-Himalayan landscape of desert valleys, monasteries, and remote caravan culture.",
        "best_for": ["Remote journeys", "Culture", "Scenic road trips"],
        "recommended_days": 6,
        "highlights": ["Arid Himalayan scenery", "Ancient settlements", "Monastic landscapes"],
        "popularity_score": 92,
    },
    "lo manthang": {
        "image_url": "/images/dest-mustang.jpg",
        "short_description": "Lo Manthang feels like a walled Himalayan capital, with Tibetan-influenced culture and rare high-desert atmosphere.",
        "best_for": ["Remote culture", "Photography", "Bucket-list circuits"],
        "recommended_days": 6,
        "highlights": ["Walled old town", "Royal Mustang culture", "Remote plateau views"],
        "popularity_score": 94,
    },
    "muktinath": {
        "image_url": "/images/dest-mustang.jpg",
        "short_description": "Muktinath combines pilgrimage significance with high-altitude scenery on one of Nepal's iconic circuit routes.",
        "best_for": ["Pilgrimage", "Mountain road trips", "Cultural trekking"],
        "recommended_days": 4,
        "highlights": ["Temple complex", "Mustang landscapes", "Annapurna circuit connection"],
        "popularity_score": 90,
    },
    "rara lake": {
        "image_url": "/images/dest-adventure.jpg",
        "short_description": "Rara Lake is Nepal's calm alpine showpiece, rewarding long travel days with expansive blue water and quiet forested surroundings.",
        "best_for": ["Remote nature", "Camping", "Scenic escapes"],
        "recommended_days": 5,
        "highlights": ["Alpine lake views", "Remote national park setting", "Quiet stargazing nights"],
        "popularity_score": 91,
    },
    "shey phoksundo": {
        "image_url": "/images/dest-adventure.jpg",
        "short_description": "Shey Phoksundo offers one of Nepal's most dramatic remote-lake landscapes, framed by cliffs and deep-blue water.",
        "best_for": ["Expedition-style travel", "Photography", "Remote trekking"],
        "recommended_days": 7,
        "highlights": ["Phoksundo Lake", "Remote Dolpo scenery", "Long-form trekking"],
        "popularity_score": 90,
    },
    "janakpur": {
        "image_url": "/images/dest-culture.jpg",
        "short_description": "Janakpur is a major spiritual and cultural destination known for Janaki Mandir, Maithili identity, and pilgrimage energy.",
        "best_for": ["Pilgrimage", "Culture", "Festival travel"],
        "recommended_days": 2,
        "highlights": ["Janaki Mandir", "Maithili art traditions", "Temple precinct walks"],
        "popularity_score": 84,
    },
    "dharan": {
        "image_url": "/images/dest-culture.jpg",
        "short_description": "Dharan combines hill-town weather, eastern Nepal energy, and quick access to viewpoints and nearby tea country.",
        "best_for": ["Short breaks", "Food", "Eastern hill stays"],
        "recommended_days": 2,
        "highlights": ["Hill-town atmosphere", "Bhedetar access", "Local cafés and bazaars"],
        "popularity_score": 82,
    },
    "ilam": {
        "image_url": "/images/dest-culture.jpg",
        "short_description": "Ilam is a softer, greener eastern escape known for rolling tea landscapes and cool-weather hill drives.",
        "best_for": ["Tea estates", "Scenic drives", "Slow travel"],
        "recommended_days": 3,
        "highlights": ["Tea gardens", "Misty ridgelines", "Relaxed hill-town pacing"],
        "popularity_score": 86,
    },
    "mardi himal": {
        "image_url": "/images/dest-adventure.jpg",
        "short_description": "Mardi Himal is a compact trekking favorite with sharp ridgeline views and relatively quick access from Pokhara.",
        "best_for": ["Short treks", "Mountain views", "Adventure"],
        "recommended_days": 4,
        "highlights": ["Ridge walks", "Annapurna panoramas", "Shorter trekking window"],
        "popularity_score": 88,
    },
}

THEME_VARIANTS = {
    "heritage_city": {
        "images": [
            "/images/dest-temple.jpg",
            "/images/dest-patan.jpg",
            "/images/dest-bhaktapur.jpg",
            "/images/hero-boudha.jpg",
            "/images/hero-stupa.jpg",
        ],
        "descriptions": [
            "{name} gives travelers a heritage-focused base in {district}, with plazas, shrines, and local food culture shaping the stay.",
            "{name} works well as a cultural stop in {district}, pairing historic streets with compact day-by-day exploration.",
            "{name} is one of the stronger heritage-led urban bases in {district}, suited to architecture, museums, and evening walks.",
            "{name} brings together civic life and heritage texture in {district}, making it a strong base for temple circuits and old-city wandering.",
            "{name} rewards travelers looking for a dense cultural stay in {district}, with landmark-rich days and atmospheric evenings.",
        ],
        "best_for": [
            ["Culture", "Architecture", "Weekend city breaks"],
            ["Photography", "Food", "History"],
            ["Families", "Heritage", "Flexible itineraries"],
            ["Local neighborhoods", "Architecture", "City breaks"],
            ["History", "Markets", "Culture"],
        ],
        "recommended_days": [2, 3, 4, 3, 2],
        "highlights": [
            ["Historic squares", "Temple circuits", "Old-town cafés"],
            ["Local markets", "Heritage streets", "Sunset viewpoints"],
            ["Artisan neighborhoods", "Cultural landmarks", "Short side trips"],
            ["City temples", "Walkable heritage core", "Local dining"],
            ["Landmark clusters", "Rooftop viewpoints", "Craft neighborhoods"],
        ],
        "popularity_base": 84,
    },
    "lake_adventure": {
        "images": [
            "/images/dest-phewa.jpg",
            "/images/dest-adventure.jpg",
            "/images/hero-pokhara.jpg",
            "/images/hero-everest.jpg",
            "/images/dest-chitwan.jpg",
        ],
        "descriptions": [
            "{name} balances scenery and soft adventure in {district}, making it easy to plan relaxed but active travel days.",
            "{name} gives travelers a scenic base in {district} with outdoor access, viewpoints, and a more open pace than the larger cities.",
            "{name} is a strong fit for travelers who want nature-forward days in {district} without giving up a comfortable base.",
            "{name} offers a scenic rhythm in {district}, where viewpoint mornings and relaxed town evenings fit naturally into a short Nepal stay.",
            "{name} works well for travelers who want a softer adventure profile in {district}, with scenic access but less logistical strain.",
        ],
        "best_for": [
            ["Adventure", "Scenic stays", "Couples"],
            ["Photography", "Road trips", "Flexible pacing"],
            ["Families", "Nature", "Soft adventure"],
            ["Viewpoints", "Relaxed pacing", "Scenic stays"],
            ["Nature", "Short escapes", "Road access"],
        ],
        "recommended_days": [3, 4, 5, 3, 4],
        "highlights": [
            ["Viewpoints", "Outdoor access", "Relaxed evenings"],
            ["Mountain scenery", "Day hikes", "Sunrise spots"],
            ["Nature walks", "Scenic transfers", "Base-town comfort"],
            ["Lakeside or hillside views", "Flexible day trips", "Sunset stops"],
            ["Short nature access", "Base-town convenience", "Scenic drives"],
        ],
        "popularity_base": 82,
    },
    "high_mountain": {
        "images": [
            "/images/dest-everest.jpg",
            "/images/dest-mustang.jpg",
            "/images/dest-adventure.jpg",
            "/images/hero-everest.jpg",
            "/images/hero-pokhara.jpg",
        ],
        "descriptions": [
            "{name} is a high-mountain stop in {district} with trail energy, weather-sensitive logistics, and standout Himalayan scenery.",
            "{name} suits travelers planning a mountain-heavy route through {district}, especially those prioritizing trekking or panoramic terrain.",
            "{name} functions as a serious mountain base in {district}, with altitude, movement days, and views shaping the experience.",
            "{name} places travelers in the mountain rhythm of {district}, where altitude, weather windows, and scenery define the stay.",
            "{name} is best treated as a mountain-focused destination in {district}, built around trail days, early starts, and panoramic payoffs.",
        ],
        "best_for": [
            ["Trekking", "Photography", "Adventure"],
            ["Expedition routes", "Nature", "Experienced travelers"],
            ["Mountain views", "Trail journeys", "Bucket-list trips"],
            ["High-altitude scenery", "Adventure", "Landscape photography"],
            ["Trekking", "Remote stays", "Scenic routes"],
        ],
        "recommended_days": [4, 5, 7, 5, 4],
        "highlights": [
            ["High-altitude scenery", "Trail-side lodges", "Clear-morning views"],
            ["Acclimatization stops", "Remote landscapes", "Mountain culture"],
            ["Ridgeline routes", "Himalayan panoramas", "Expedition pacing"],
            ["Early-start mountain days", "High viewpoints", "Weather-shaped itineraries"],
            ["Trail access", "Long-range panoramas", "Mountain village atmosphere"],
        ],
        "popularity_base": 87,
    },
    "pilgrimage_heritage": {
        "images": [
            "/images/dest-lumbini.jpg",
            "/images/dest-temple.jpg",
            "/images/dest-culture.jpg",
            "/images/hero-stupa.jpg",
            "/images/hero-boudha.jpg",
        ],
        "descriptions": [
            "{name} is best approached as a reflective heritage stop in {district}, with spiritual sites and a slower visitor rhythm.",
            "{name} brings together pilgrimage value and local cultural identity in {district}, making it ideal for shorter but meaningful stays.",
            "{name} offers a focused heritage experience in {district}, centered on sacred sites, rituals, and quiet exploration.",
            "{name} gives {district} a more reflective travel rhythm, with sacred landmarks and culturally significant spaces shaping the visit.",
            "{name} suits travelers who want a meaningful heritage stop in {district}, with slower pacing and landmark-led days.",
        ],
        "best_for": [
            ["Pilgrimage", "Reflection", "Cultural travel"],
            ["History", "Families", "Short stays"],
            ["Temple visits", "Slow travel", "Spiritual routes"],
            ["Heritage", "Quiet travel", "Culture"],
            ["Temple circuits", "History", "Reflective stays"],
        ],
        "recommended_days": [2, 3, 4, 2, 3],
        "highlights": [
            ["Sacred sites", "Monastic or temple zones", "Quiet morning visits"],
            ["Local rituals", "Historic precincts", "Cultural storytelling"],
            ["Heritage walks", "Spiritual landmarks", "Reflective pacing"],
            ["Sacred precincts", "Slow cultural routes", "Landmark mornings"],
            ["Temple-focused days", "Historic spaces", "Local ritual atmosphere"],
        ],
        "popularity_base": 81,
    },
    "wildlife_plains": {
        "images": [
            "/images/dest-chitwan.jpg",
            "/images/dest-adventure.jpg",
            "/images/dest-culture.jpg",
            "/images/hero-pokhara.jpg",
            "/images/dest-phewa.jpg",
        ],
        "descriptions": [
            "{name} works as a warm-weather base in {district}, ideal for wildlife access, lower-elevation travel, and road-linked itineraries.",
            "{name} supports safari-style and plains-region travel in {district}, with easier logistics than remote mountain routes.",
            "{name} is a practical southern Nepal base in {district}, suited to nature activities, family travel, and steady pacing.",
            "{name} offers a lower-elevation travel base in {district}, where access, warmer climate, and easier movement shape the trip.",
            "{name} is well suited to travelers planning a softer nature-led route through {district}, especially when road access matters.",
        ],
        "best_for": [
            ["Wildlife", "Families", "Road trips"],
            ["Nature", "Beginner-friendly travel", "Short escapes"],
            ["Parks access", "Warm-weather breaks", "Flexible itineraries"],
            ["Family travel", "Regional nature", "Comfortable pacing"],
            ["Road-linked escapes", "Warm-weather travel", "Soft adventure"],
        ],
        "recommended_days": [2, 3, 4, 3, 2],
        "highlights": [
            ["National park access", "River or grassland scenery", "Day activities"],
            ["Lower-elevation comfort", "Family-friendly pacing", "Regional food stops"],
            ["Wildlife excursions", "Sunset walks", "Base-town convenience"],
            ["Regional transport ease", "Nature days", "Warm evenings"],
            ["Accessible day trips", "Easy transfers", "Flexible family plans"],
        ],
        "popularity_base": 79,
    },
    "remote_frontier": {
        "images": [
            "/images/dest-mustang.jpg",
            "/images/dest-adventure.jpg",
            "/images/dest-everest.jpg",
            "/images/hero-everest.jpg",
            "/images/hero-pokhara.jpg",
        ],
        "descriptions": [
            "{name} rewards longer transfers into {district} with a remote-travel feel, stronger landscape contrast, and fewer crowds.",
            "{name} fits travelers who want frontier-style Nepal in {district}, where the journey is as important as the stop itself.",
            "{name} is a remote base in {district} with wide terrain, simpler infrastructure, and strong payoff for slower itineraries.",
            "{name} leans into a more remote Nepal experience in {district}, with sparse infrastructure and memorable overland movement.",
            "{name} is best for travelers who want the payoff of distance in {district}, where landscapes feel larger and crowds fall away.",
        ],
        "best_for": [
            ["Remote journeys", "Scenic drives", "Photography"],
            ["Slow travel", "Adventure", "Offbeat routes"],
            ["Culture", "Road expeditions", "Longer itineraries"],
            ["Landscape photography", "Remote travel", "Road journeys"],
            ["Offbeat Nepal", "Adventure", "Long-form itineraries"],
        ],
        "recommended_days": [4, 6, 7, 5, 6],
        "highlights": [
            ["Remote landscapes", "Lower crowds", "Long scenic transfers"],
            ["Regional culture", "Wide-open terrain", "Offbeat route planning"],
            ["Frontier atmosphere", "Memorable road days", "Rare viewpoints"],
            ["Remote arrival payoff", "Long-distance scenery", "Sparse travel rhythm"],
            ["Less-traveled routes", "Regional character", "Big-landscape views"],
        ],
        "popularity_base": 78,
    },
}


THEME_KEYWORDS = [
    ("high_mountain", ["base camp", "khumbu", "lukla", "namche", "everest", "rara", "phoksundo", "lake", "pass", "himal", "gompa", "hill", "mardi", "tilicho", "thorong"]),
    ("pilgrimage_heritage", ["lumbini", "janakpur", "muktinath", "temple", "gompa"]),
    ("wildlife_plains", ["chitwan", "bharatpur", "butwal", "bhairahawa", "dang", "tikapur"]),
    ("remote_frontier", ["mustang", "manang", "dolpa", "humla", "mugu", "darchula", "khaptad", "jumla", "simikot"]),
]


def _stable_index(*values, modulo):
    seed = "|".join(str(value or "") for value in values)
    digest = hashlib.md5(seed.encode("utf-8")).hexdigest()
    return int(digest, 16) % modulo


def _normalize_list(value):
    if isinstance(value, list):
        return [item for item in value if item]
    return []


def _infer_theme(destination):
    searchable = " ".join(
        filter(
            None,
            [destination.name, destination.district, destination.province, destination.category],
        )
    ).lower()

    for theme, keywords in THEME_KEYWORDS:
        if any(keyword in searchable for keyword in keywords):
            return theme

    if destination.category == "Major City":
        if (destination.province or "").startswith("Bagmati"):
            return "heritage_city"
        if (destination.province or "").startswith(("Madhesh", "Lumbini")):
            return "pilgrimage_heritage"
        return "wildlife_plains"

    if (destination.province or "") in {"Bagmati Province", "Lumbini Province"}:
        return "pilgrimage_heritage"
    if (destination.province or "") in {"Karnali Province", "Sudurpashchim Province"}:
        return "remote_frontier"
    if (destination.province or "") in {"Gandaki Province", "Koshi Province"}:
        return "high_mountain"
    return "lake_adventure"


def build_destination_metadata(destination):
    curated = CURATED_DESTINATION_DATA.get((destination.name or "").strip().lower(), {})
    theme = _infer_theme(destination)
    variants = THEME_VARIANTS[theme]
    image_index = _stable_index(
        destination.geoname_id,
        destination.name,
        destination.district,
        "image",
        modulo=len(variants["images"]),
    )
    text_index = _stable_index(
        destination.geoname_id,
        destination.name,
        destination.province,
        "text",
        modulo=len(variants["descriptions"]),
    )

    district = destination.district or destination.province or "Nepal"

    image_url = destination.image_url or curated.get("image_url") or variants["images"][image_index]
    short_description = (
        (destination.short_description or "").strip()
        or curated.get("short_description")
        or variants["descriptions"][text_index].format(name=destination.name, district=district)
    )
    best_for = _normalize_list(destination.best_for) or curated.get("best_for") or variants["best_for"][text_index]
    recommended_days = destination.recommended_days or curated.get("recommended_days") or variants["recommended_days"][text_index]
    highlights = _normalize_list(destination.highlights) or curated.get("highlights") or variants["highlights"][text_index]
    popularity_score = destination.popularity_score or curated.get("popularity_score")
    if popularity_score is None:
        popularity_score = min(99, variants["popularity_base"] + _stable_index(destination.name, destination.province, modulo=8))

    return {
        "theme": theme,
        "image_url": image_url,
        "short_description": short_description,
        "best_for": best_for,
        "recommended_days": recommended_days,
        "highlights": highlights,
        "popularity_score": popularity_score,
    }
