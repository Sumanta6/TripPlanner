import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from guides.models import GuideProfile
from accounts.models import TravelerProfile

# Create dummy users
user, _ = User.objects.get_or_create(username='traveler1', email='t@t.com')
user.set_password('test')
user.save()

guide_user, _ = User.objects.get_or_create(username='guide1', email='g@g.com')
guide, _ = GuideProfile.objects.get_or_create(user=guide_user, full_name='Guide 1')

c = Client()
c.force_login(user)

response = c.post(f'/api/guides/{guide.id}/request/', {
    'destination': 'Kathmandu',
    'trip_start': '2025-01-01',
    'trip_end': '2025-01-05',
    'notes': 'test'
}, content_type='application/json', HTTP_HOST='localhost')

print('Status:', response.status_code)
print('Content:', response.content)
