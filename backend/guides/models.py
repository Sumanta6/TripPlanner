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

    experience_years = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
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
        ('pending',       'Pending'),
        ('accepted',      'Accepted'),
        ('active',        'Active'),
        ('completed',     'Completed'),
        ('cancelled',     'Cancelled'),
        ('rejected',      'Rejected'),
        ('auto_rejected', 'Auto Rejected'),
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
    # Link to the AI-generated itinerary (if the traveler saved one)
    itinerary = models.ForeignKey(
        'itinerary.SavedItinerary',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
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
        ('rejected', 'Rejected'),
        ('auto_rejected', 'Auto Rejected'),
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


class Review(models.Model):
    """Verified traveler review tied to a completed booking."""

    guide = models.ForeignKey(
        GuideProfile, on_delete=models.CASCADE, related_name='reviews'
    )
    traveler = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='guide_reviews'
    )
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name='review'
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name='guides_review_rating_between_1_and_5',
            ),
        ]

    def __str__(self):
        return f"Review {self.rating}/5 for {self.guide} by {self.traveler}"


class ChatMessage(models.Model):
    """Persistent booking-scoped chat message between one traveler and one guide."""

    SENDER_CHOICES = [
        ('guide', 'Guide'),
        ('traveler', 'Traveler'),
    ]

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name='chat_messages'
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='booking_chat_messages'
    )
    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_booking_chat_messages',
        null=True, blank=True
    )
    sender_role = models.CharField(max_length=20, choices=SENDER_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'

    def __str__(self):
        return f"{self.sender_role} message for booking #{self.booking_id}"
