import random
from django.core.management.base import BaseCommand
from destinations.models import Destination

class Command(BaseCommand):
    help = 'Seeds the database with 1000+ destinations in Nepal'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing destinations...')
        Destination.objects.all().delete()

        regions = ['Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini', 'Mustang', 'Solukhumbu', 'Annapurna', 'Langtang', 'Manaslu', 'Dolpo', 'Ilam', 'Janakpur', 'Bardiya', 'Kanchenjunga', 'Rara', 'Makalu', 'Gorkha', 'Nuwakot', 'Sindhupalchok', 'Dharan']
        types = ['Valley', 'Lake', 'Peak', 'Base Camp', 'Temple', 'Stupa', 'National Park', 'Conservation Area', 'Village', 'Pass', 'Glacier', 'Forest', 'River', 'Waterfall', 'Cave', 'Hill', 'Wildlife Reserve', 'Durbar Square', 'Museum', 'Monastery']
        adjectives = ['Beautiful', 'Serene', 'Majestic', 'Sacred', 'Hidden', 'Ancient', 'Mystical', 'Pristine', 'Scenic', 'Breathtaking', 'Peaceful', 'Wild', 'Untouched', 'Historic', 'Cultural', 'Vibrant', 'Snow-capped', 'Lush', 'Golden', 'Emerald']
        
        destinations = []
        image_keywords = ['nepal', 'mountain', 'himalaya', 'temple', 'nature', 'landscape', 'trekking', 'lake']

        self.stdout.write('Generating destination data...')
        
        for i in range(1050):
            region = random.choice(regions)
            place_type = random.choice(types)
            adjective = random.choice(adjectives)
            
            # Create a unique name to ensure variety even with random choices
            name = f"{adjective} {region} {place_type} {i+1}"
            
            description = (
                f"Experience the {adjective.lower()} beauty of {name}. "
                f"Located in the breathtaking {region} area, this {place_type.lower()} offers "
                f"unparalleled views, rich cultural encounters, and an unforgettable adventure. "
                f"Whether you are looking for serenity or thrill, {name} is the perfect choice for your next trip."
            )
            
            image_keyword = random.choice(image_keywords)
            # Use random image from source.unsplash or picsum for variety
            # Adding a random salt to the URL avoids browser caching the same image
            image_url = f"https://source.unsplash.com/800x600/?{image_keyword}&sig={i}"
            
            location = f"{region}, Nepal"
            rating = round(random.uniform(3.5, 5.0), 1)

            destinations.append(
                Destination(
                    name=name,
                    description=description,
                    image_url=image_url,
                    location=location,
                    rating=rating
                )
            )

        self.stdout.write('Bulk inserting destinations...')
        # Bulk create for efficiency
        Destination.objects.bulk_create(destinations, batch_size=100)
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(destinations)} destinations!'))
