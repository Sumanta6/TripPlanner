from django.db import models
from django.contrib.auth.models import User


class GuideProfile(models.Model):
    """Extended profile for a guide user."""

    AVAILABILITY_CHOICES = [
        ('available', 'Available'),
        ('busy', 'Busy'),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='guide_profile'
    )
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    profile_image = models.ImageField(
        upload_to='guide_images/', null=True, blank=True
    )
    bio = models.TextField(blank=True)

    # Stored as JSON arrays, e.g. ["Nepali","English"]
    languages = models.JSONField(default=list, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    destinations = models.JSONField(default=list, blank=True)

    experience_years = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    tours_completed = models.PositiveIntegerField(default=0)

    availability = models.CharField(
        max_length=20,
        choices=AVAILABILITY_CHOICES,
        default='available',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Guide Profile'
        verbose_name_plural = 'Guide Profiles'

    def __str__(self):
        return self.full_name or self.user.username


class Booking(models.Model):
    """A traveler booking / assignment linked to a guide."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('upcoming', 'Upcoming'),
        ('completed', 'Completed'),
        ('pending', 'Pending'),
    ]

    guide = models.ForeignKey(
        GuideProfile, on_delete=models.CASCADE, related_name='bookings'
    )
    # Optional link to a registered traveler user
    traveler_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guide_bookings',
    )

    traveler_name = models.CharField(max_length=150)
    traveler_email = models.EmailField(blank=True)
    traveler_phone = models.CharField(max_length=30, blank=True)
    destination = models.CharField(max_length=200)
    trip_start = models.DateField()
    trip_end = models.DateField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-trip_start']
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'

    def __str__(self):
        return f"{self.traveler_name} → {self.destination} ({self.status})"


class Activity(models.Model):
    """Activity-feed entry for a guide (assignments, ratings, completions, etc.)."""

    TYPE_CHOICES = [
        ('assignment', 'Assignment'),
        ('accepted', 'Accepted'),
        ('request', 'Request'),
        ('completed', 'Completed'),
        ('upcoming', 'Upcoming'),
        ('rating', 'Rating'),
    ]

    guide = models.ForeignKey(
        GuideProfile, on_delete=models.CASCADE, related_name='activities'
    )
    activity_type = models.CharField(
        max_length=30, choices=TYPE_CHOICES, default='assignment'
    )
    message = models.CharField(max_length=300)
    highlight = models.CharField(max_length=150, blank=True)
    sub = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'

    def __str__(self):
        return f"[{self.activity_type}] {self.highlight}"
