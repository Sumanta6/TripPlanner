import requests
import time
from django.core.management.base import BaseCommand

from destinations.enrichment import build_destination_metadata
from destinations.models import GeoNameDestination

class Command(BaseCommand):
    help = 'Fetches populated places in Nepal from GeoNames API and stores them locally.'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='demo', help='GeoNames API username')
        parser.add_argument('--max-rows', type=int, default=1000, help='Max rows per page')

    def handle(self, *args, **options):
        username = options['username']
        max_rows = min(options['max_rows'], 1000) # GeoNames max is 1000
        country = 'NP'
        feature_class = 'P'

        self.stdout.write(self.style.NOTICE(f"Fetching GeoNames destinations for {country}..."))

        base_url = "http://api.geonames.org/searchJSON"
        start_row = 0
        total_fetched = 0
        total_results = None

        while True:
            params = {
                'country': country,
                'featureClass': feature_class,
                'maxRows': max_rows,
                'startRow': start_row,
                'username': username,
                'style': 'FULL'
            }

            self.stdout.write(f"Fetching startRow={start_row}...")
            
            try:
                response = requests.get(base_url, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                if 'status' in data and data['status'].get('message'):
                    self.stdout.write(self.style.ERROR(f"API Error: {data['status']['message']}"))
                    break
                    
                total_results = data.get('totalResultsCount', 0)
                geonames = data.get('geonames', [])
                
                if not geonames:
                    self.stdout.write("No more results.")
                    break
                    
                created_or_updated = 0
                for geo in geonames:
                    geoname_id = geo.get('geonameId')
                    if not geoname_id:
                        continue
                        
                    # Basic category mapping logic based on fcode or just default to Sight
                    fcode = geo.get('fcode', '')
                    category = 'Sight'
                    if fcode in ['PPLA', 'PPLA2', 'PPLC', 'PPLA3']:
                        category = 'Major City'
                    elif fcode in ['PPL', 'PPLQ', 'PPLW']:
                        category = 'Village/Town'
                        
                    defaults = {
                        'name': geo.get('name', 'Unknown'),
                        'province': geo.get('adminName1', ''),
                        'district': geo.get('adminName2', ''),
                        'latitude': float(geo.get('lat', 0.0)),
                        'longitude': float(geo.get('lng', 0.0)),
                        'country_code': geo.get('countryCode', 'NP'),
                        'category': category,
                    }
                    dest_obj = GeoNameDestination(
                        geoname_id=geoname_id,
                        **defaults,
                    )
                    metadata = build_destination_metadata(dest_obj)
                    defaults.update(
                        {
                            'image_url': metadata["image_url"],
                            'short_description': metadata["short_description"],
                            'best_for': metadata["best_for"],
                            'recommended_days': metadata["recommended_days"],
                            'highlights': metadata["highlights"],
                            'popularity_score': metadata["popularity_score"],
                        }
                    )
                    GeoNameDestination.objects.update_or_create(
                        geoname_id=geoname_id,
                        defaults=defaults,
                    )
                    created_or_updated += 1
                
                fetched_count = len(geonames)
                total_fetched += fetched_count
                self.stdout.write(self.style.SUCCESS(f"Saved {created_or_updated} destinations. (Total fetched: {total_fetched}/{total_results})"))
                
                if len(geonames) < max_rows:
                    # Last page
                    break
                    
                start_row += max_rows
                time.sleep(1) # Respect rate limits slightly
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Exception during fetch: {str(e)}"))
                break

        self.stdout.write(self.style.SUCCESS(f"Finished. Total saved/updated: {total_fetched}"))
