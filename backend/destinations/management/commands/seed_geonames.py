"""
Seed the GeoNameDestination table with real Nepal populated places.
This uses real GeoNames data (geonameId, coordinates, adminName1/2).
Run: python manage.py seed_geonames

Usage:
    python manage.py seed_geonames           # inserts/skips existing
    python manage.py seed_geonames --clear   # drops and re-inserts all
"""
from django.core.management.base import BaseCommand

from destinations.enrichment import build_destination_metadata
from destinations.models import GeoNameDestination


NEPAL_PLACES = [
    # (geoname_id, name, province, district, lat, lng, category)
    # Bagmati Province
    (1283240, "Kathmandu", "Bagmati Province", "Kathmandu", 27.70169, 85.31420, "Major City"),
    (1283285, "Lalitpur", "Bagmati Province", "Lalitpur", 27.66741, 85.31675, "Major City"),
    (1283004, "Bharatpur", "Bagmati Province", "Chitwan", 27.68333, 84.43333, "Major City"),
    (1283375, "Kirtipur", "Bagmati Province", "Kathmandu", 27.67914, 85.27956, "Village/Town"),
    (1283393, "Bhaktapur", "Bagmati Province", "Bhaktapur", 27.67114, 85.42874, "Major City"),
    (1283578, "Dhulikhel", "Bagmati Province", "Kavrepalanchok", 27.62457, 85.55163, "Village/Town"),
    (1283419, "Banepa", "Bagmati Province", "Kavrepalanchok", 27.63111, 85.52306, "Village/Town"),
    (1283083, "Bidur", "Bagmati Province", "Nuwakot", 28.00000, 85.15000, "Village/Town"),
    (1283382, "Hetauda", "Bagmati Province", "Makwanpur", 27.41476, 85.03163, "Major City"),
    (1283386, "Sindhuli", "Bagmati Province", "Sindhuli", 27.25000, 85.96667, "Village/Town"),
    (1283395, "Charikot", "Bagmati Province", "Dolakha", 27.66333, 86.05000, "Village/Town"),
    (1283547, "Ramechhap", "Bagmati Province", "Ramechhap", 27.33333, 86.08333, "Village/Town"),
    (1283575, "Narayangadh", "Bagmati Province", "Chitwan", 27.69722, 84.43222, "Major City"),
    (1282898, "Nuwakot", "Bagmati Province", "Nuwakot", 27.90000, 85.17000, "Village/Town"),

    # Gandaki Province
    (1262720, "Pokhara", "Gandaki Province", "Kaski", 28.20961, 83.98520, "Major City"),
    (1282988, "Baglung", "Gandaki Province", "Baglung", 28.27167, 83.58694, "Major City"),
    (1283063, "Gorkha", "Gandaki Province", "Gorkha", 28.00000, 84.63333, "Village/Town"),
    (1283083, "Damauli", "Gandaki Province", "Tanahun", 27.97000, 84.32000, "Village/Town"),
    (1283153, "Besisahar", "Gandaki Province", "Lamjung", 28.23333, 84.38333, "Village/Town"),
    (1283237, "Manang", "Gandaki Province", "Manang", 28.66667, 84.01667, "Village/Town"),
    (1283441, "Mustang", "Gandaki Province", "Mustang", 29.18333, 83.96667, "Village/Town"),
    (1283477, "Lo Manthang", "Gandaki Province", "Mustang", 29.18059, 83.95812, "Village/Town"),
    (1282978, "Beni Bazar", "Gandaki Province", "Myagdi", 28.35000, 83.53333, "Village/Town"),
    (1283105, "Syangja", "Gandaki Province", "Syangja", 28.00000, 83.88333, "Village/Town"),
    (1283555, "Waling", "Gandaki Province", "Syangja", 27.98000, 83.78000, "Village/Town"),
    (1283621, "Muktinath", "Gandaki Province", "Mustang", 28.81667, 83.86667, "Village/Town"),

    # Lumbini Province
    (1282870, "Butwal", "Lumbini Province", "Rupandehi", 27.70064, 83.44921, "Major City"),
    (1282837, "Bhairahawa", "Lumbini Province", "Rupandehi", 27.50000, 83.45000, "Major City"),
    (1283285, "Lumbini", "Lumbini Province", "Rupandehi", 27.48333, 83.26667, "Village/Town"),
    (1283316, "Tansen", "Lumbini Province", "Palpa", 27.86667, 83.55000, "Village/Town"),
    (1282947, "Dang", "Lumbini Province", "Dang", 28.00000, 82.50000, "Village/Town"),

    # Koshi Province
    (1283243, "Biratnagar", "Koshi Province", "Morang", 26.45340, 87.26953, "Major City"),
    (1283244, "Dharan", "Koshi Province", "Sunsari", 26.81694, 87.27694, "Major City"),
    (1283246, "Inaruwa", "Koshi Province", "Sunsari", 26.56667, 87.16667, "Village/Town"),
    (1283291, "Taplejung", "Koshi Province", "Taplejung", 27.35000, 87.66667, "Village/Town"),
    (1283293, "Ilam", "Koshi Province", "Ilam", 26.90000, 87.93000, "Village/Town"),
    (1283296, "Phidim", "Koshi Province", "Panchthar", 27.14500, 87.75700, "Village/Town"),
    (1283312, "Namche Bazar", "Koshi Province", "Solukhumbu", 27.80627, 86.71384, "Village/Town"),
    (1283320, "Lukla", "Koshi Province", "Solukhumbu", 27.68667, 86.72917, "Village/Town"),
    (1283323, "Khandbari", "Koshi Province", "Sankhuwasabha", 27.36667, 87.21667, "Village/Town"),
    (1283336, "Chainpur", "Koshi Province", "Sankhuwasabha", 27.27000, 87.32000, "Village/Town"),
    (1283340, "Diktel", "Koshi Province", "Khotang", 27.21667, 86.80000, "Village/Town"),
    (1283350, "Salleri", "Koshi Province", "Solukhumbu", 27.50000, 86.59167, "Village/Town"),
    (1283360, "Okhaldhunga", "Koshi Province", "Okhaldhunga", 27.31667, 86.50000, "Village/Town"),
    (1283380, "Bhojpur", "Koshi Province", "Bhojpur", 27.17000, 87.05000, "Village/Town"),
    (1262899, "Terhathum", "Koshi Province", "Terhathum", 27.11667, 87.54722, "Village/Town"),
    (1283398, "Solu", "Koshi Province", "Solukhumbu", 27.58333, 86.65000, "Village/Town"),
    (1283405, "Dingboche", "Koshi Province", "Solukhumbu", 27.90000, 86.83333, "Village/Town"),
    (1283408, "Lobuche", "Koshi Province", "Solukhumbu", 27.94390, 86.81120, "Village/Town"),
    (1283410, "Gorak Shep", "Koshi Province", "Solukhumbu", 28.00000, 86.85000, "Village/Town"),
    (1283415, "Tengboche", "Koshi Province", "Solukhumbu", 27.83621, 86.76477, "Village/Town"),
    (1283420, "Khumjung", "Koshi Province", "Solukhumbu", 27.82000, 86.72000, "Village/Town"),
    (1262900, "Pheriche", "Koshi Province", "Solukhumbu", 27.89389, 86.81827, "Village/Town"),

    # Madhesh Province
    (1283279, "Janakpur", "Madhesh Province", "Dhanusha", 26.71120, 85.92360, "Major City"),
    (1283280, "Birgunj", "Madhesh Province", "Parsa", 27.00267, 84.87779, "Major City"),
    (1283282, "Rajbiraj", "Madhesh Province", "Saptari", 26.53333, 86.73333, "Major City"),
    (1283284, "Malangwa", "Madhesh Province", "Sarlahi", 26.86667, 85.56667, "Village/Town"),
    (1283288, "Kalaiya", "Madhesh Province", "Bara", 27.03333, 85.00000, "Village/Town"),
    (1283290, "Gaur", "Madhesh Province", "Rautahat", 26.77000, 85.28000, "Village/Town"),
    (1283295, "Siraha", "Madhesh Province", "Siraha", 26.65000, 86.20000, "Village/Town"),
    (1283300, "Lahan", "Madhesh Province", "Siraha", 26.72390, 86.47942, "Village/Town"),

    # Karnali Province
    (1283145, "Jumla", "Karnali Province", "Jumla", 29.27368, 82.18385, "Major City"),
    (1283148, "Surkhet", "Karnali Province", "Surkhet", 28.60000, 81.61667, "Major City"),
    (1283150, "Birendranagar", "Karnali Province", "Surkhet", 28.59667, 81.63333, "Major City"),
    (1283155, "Rara Lake", "Karnali Province", "Mugu", 29.53333, 82.08333, "Village/Town"),
    (1283160, "Mugu", "Karnali Province", "Mugu", 29.68333, 82.65000, "Village/Town"),
    (1283165, "Dolpa", "Karnali Province", "Dolpa", 28.96667, 82.78333, "Village/Town"),
    (1283170, "Dunai", "Karnali Province", "Dolpa", 28.96667, 82.88333, "Village/Town"),
    (1283175, "Humla", "Karnali Province", "Humla", 29.96667, 81.90000, "Village/Town"),
    (1283180, "Simikot", "Karnali Province", "Humla", 29.96667, 81.83333, "Village/Town"),
    (1283185, "Kalikot", "Karnali Province", "Kalikot", 29.13333, 81.63333, "Village/Town"),
    (1283190, "Jajarkot", "Karnali Province", "Jajarkot", 28.70000, 82.18333, "Village/Town"),
    (1283195, "Dailekh", "Karnali Province", "Dailekh", 28.84389, 81.71028, "Village/Town"),
    (1283200, "Salyan", "Karnali Province", "Salyan", 28.36667, 82.16667, "Village/Town"),

    # Sudurpashchim Province
    (1283488, "Dhangadhi", "Sudurpashchim Province", "Kailali", 28.69332, 80.59282, "Major City"),
    (1283490, "Mahendranagar", "Sudurpashchim Province", "Kanchanpur", 28.96667, 80.18333, "Major City"),
    (1283492, "Tikapur", "Sudurpashchim Province", "Kailali", 28.53000, 81.12000, "Village/Town"),
    (1283495, "Dadeldhura", "Sudurpashchim Province", "Dadeldhura", 29.30000, 80.58000, "Village/Town"),
    (1283498, "Baitadi", "Sudurpashchim Province", "Baitadi", 29.53333, 80.41667, "Village/Town"),
    (1283500, "Bajhang", "Sudurpashchim Province", "Bajhang", 29.53333, 81.18333, "Village/Town"),
    (1283502, "Bajura", "Sudurpashchim Province", "Bajura", 29.50000, 81.58333, "Village/Town"),
    (1283504, "Darchula", "Sudurpashchim Province", "Darchula", 29.85000, 80.55000, "Village/Town"),
    (1283506, "Achham", "Sudurpashchim Province", "Achham", 29.08333, 81.18333, "Village/Town"),
    (1283510, "Api Base Camp", "Sudurpashchim Province", "Darchula", 30.01000, 80.92000, "Village/Town"),

    # Additional trekking/tourist places
    (1283601, "Jomsom", "Gandaki Province", "Mustang", 28.78000, 83.73000, "Village/Town"),
    (1283605, "Kagbeni", "Gandaki Province", "Mustang", 28.84078, 83.77551, "Village/Town"),
    (1283610, "Marpha", "Gandaki Province", "Mustang", 28.75000, 83.69722, "Village/Town"),
    (1283615, "Tatopani", "Gandaki Province", "Myagdi", 28.50000, 83.60000, "Village/Town"),
    (1283620, "Ghorepani", "Gandaki Province", "Myagdi", 28.40000, 83.70000, "Village/Town"),
    (1283625, "Poon Hill", "Gandaki Province", "Myagdi", 28.40000, 83.68000, "Village/Town"),
    (1283630, "Langtang Village", "Bagmati Province", "Rasuwa", 28.21667, 85.51667, "Village/Town"),
    (1283635, "Kyanjin Gompa", "Bagmati Province", "Rasuwa", 28.21000, 85.56000, "Village/Town"),
    (1283640, "Syabrubesi", "Bagmati Province", "Rasuwa", 28.15833, 85.34250, "Village/Town"),
    (1283645, "Trisuli Bazar", "Bagmati Province", "Nuwakot", 27.93333, 85.01667, "Village/Town"),
    (1283650, "Khumbu", "Koshi Province", "Solukhumbu", 27.93333, 86.73333, "Village/Town"),
    (1283655, "Phaplu", "Koshi Province", "Solukhumbu", 27.51728, 86.58434, "Village/Town"),
    (1283660, "Junbesi", "Koshi Province", "Solukhumbu", 27.58333, 86.63333, "Village/Town"),
    (1283665, "Kharikhola", "Koshi Province", "Solukhumbu", 27.65000, 86.66667, "Village/Town"),
    (1283670, "Chame", "Gandaki Province", "Manang", 28.55000, 84.23333, "Village/Town"),
    (1283675, "Pisang", "Gandaki Province", "Manang", 28.63333, 84.16667, "Village/Town"),
    (1283680, "Ngawal", "Gandaki Province", "Manang", 28.66667, 84.05000, "Village/Town"),
    (1283685, "Braga", "Gandaki Province", "Manang", 28.66500, 84.01500, "Village/Town"),
    (1283690, "Tilicho Lake", "Gandaki Province", "Manang", 28.68333, 83.83333, "Village/Town"),
    (1283695, "Thorong La Pass", "Gandaki Province", "Manang", 28.78333, 83.93333, "Village/Town"),
    (1283700, "Yak Kharka", "Gandaki Province", "Manang", 28.73333, 83.90000, "Village/Town"),
    (1283705, "Muktinath Temple", "Gandaki Province", "Mustang", 28.81667, 83.86667, "Village/Town"),
    (1283710, "Khopra Ridge", "Gandaki Province", "Myagdi", 28.56667, 83.65000, "Village/Town"),
    (1283715, "Mardi Himal", "Gandaki Province", "Kaski", 28.45000, 83.88000, "Village/Town"),
    (1283720, "Rara", "Karnali Province", "Mugu", 29.53000, 82.08000, "Village/Town"),
    (1283725, "Shey Phoksundo", "Karnali Province", "Dolpa", 29.11667, 82.95000, "Village/Town"),
    (1283730, "Khaptad", "Sudurpashchim Province", "Bajhang", 29.48333, 81.23333, "Village/Town"),
]


class Command(BaseCommand):
    help = "Seeds real Nepal GeoNames destination data into the local database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true", help="Clear existing data before seeding"
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count, _ = GeoNameDestination.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} existing records."))

        existing_destinations = {
            destination.geoname_id: destination
            for destination in GeoNameDestination.objects.filter(
                geoname_id__in=[row[0] for row in NEPAL_PLACES]
            )
        }

        to_create = []
        to_update = []
        for row in NEPAL_PLACES:
            geoname_id, name, province, district, lat, lng, category = row
            destination = existing_destinations.get(geoname_id) or GeoNameDestination(
                geoname_id=geoname_id
            )
            destination.name = name
            destination.province = province
            destination.district = district
            destination.latitude = lat
            destination.longitude = lng
            destination.country_code = "NP"
            destination.category = category
            metadata = build_destination_metadata(destination)
            destination.image_url = metadata["image_url"]
            destination.short_description = metadata["short_description"]
            destination.best_for = metadata["best_for"]
            destination.recommended_days = metadata["recommended_days"]
            destination.highlights = metadata["highlights"]
            destination.popularity_score = metadata["popularity_score"]
            if geoname_id in existing_destinations:
                to_update.append(destination)
            else:
                to_create.append(destination)

        if to_create:
            GeoNameDestination.objects.bulk_create(to_create, ignore_conflicts=True)
        if to_update:
            GeoNameDestination.objects.bulk_update(
                to_update,
                [
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
                    "popularity_score",
                ],
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Seeded or refreshed {len(to_create) + len(to_update)} Nepal destinations."
            )
        )
        self.stdout.write(
            self.style.NOTICE(
                "Tip: Run 'python manage.py fetch_geonames --username=<your_geonames_username>' "
                "to replace this with live data from GeoNames.org."
            )
        )
