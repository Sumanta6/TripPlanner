from django.db import models


class Destination(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    location = models.CharField(max_length=255)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)

    def __str__(self):
        return self.name

class GeoNameDestination(models.Model):
    geoname_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=255, db_index=True)
    province = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    district = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    country_code = models.CharField(max_length=10, default="NP")
    category = models.CharField(max_length=100, default="Sight", db_index=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    short_description = models.TextField(blank=True, default="")
    best_for = models.JSONField(blank=True, default=list)
    recommended_days = models.PositiveSmallIntegerField(blank=True, null=True)
    highlights = models.JSONField(blank=True, default=list)
    popularity_score = models.PositiveSmallIntegerField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.province})"
