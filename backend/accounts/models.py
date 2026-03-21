from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.user.username


class TravelerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="traveler_profile")
    full_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    profile_image = models.ImageField(upload_to='traveler_images/', null=True, blank=True)
    bio = models.TextField(blank=True)
    preferred_destinations = models.JSONField(default=list, blank=True)
    travel_style = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.full_name or self.user.username


class Trip(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trips")
    from_city = models.CharField(max_length=100)
    to_city = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return f"{self.from_city} → {self.to_city}"
