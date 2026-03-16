from django.db import models
from django.contrib.auth.models import User


class SavedItinerary(models.Model):
    """A fully-generated AI itinerary saved by a traveler."""

    traveler = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='saved_itineraries',
    )
    destination = models.CharField(max_length=200)
    starting_place = models.CharField(max_length=200, blank=True, default='Kathmandu')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    days = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)           # e.g. auto-adjustment note
    itinerary_data = models.JSONField(default=dict) # full normalised itinerary payload
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Saved Itinerary'
        verbose_name_plural = 'Saved Itineraries'

    def __str__(self):
        return f"{self.traveler.username} – {self.destination} ({self.days}d)"
