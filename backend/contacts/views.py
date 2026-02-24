from rest_framework import generics, status, permissions
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from .models import Contact
from .serializers import ContactSerializer

class ContactCreateView(generics.CreateAPIView):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def perform_create(self, serializer):
        contact = serializer.save()
        
        # Admin Notification
        admin_subject = "TripPlanner Contact Message"
        admin_message = f"""
New Inquiry Received via TripPlanner Contact Form

--------------------------------------------------
SENDER DETAILS
--------------------------------------------------
Name:    {contact.name}
Email:   {contact.email}
Phone:   {contact.phone or 'Not Provided'}
Subject: {contact.subject}

--------------------------------------------------
MESSAGE CONTENT
--------------------------------------------------
{contact.message}

--------------------------------------------------
Submission Date: {contact.created_at.strftime('%Y-%m-%d %H:%M:%S')}
        """
        try:
            send_mail(
                admin_subject,
                admin_message,
                f"TripPlanner <{settings.DEFAULT_FROM_EMAIL}>",
                ['tripplannnerr@gmail.com'],
                fail_silently=True
            )
        except Exception as e:
            print(f"Admin mail error: {e}")

        # User Confirmation
        user_subject = "Message Received ✅ - TripPlanner"
        user_message = f"""
Hi {contact.name},

Thank you for reaching out to TripPlanner!

We have received your message and our team will respond via email within 24 hours.

Best regards,
The TripPlanner Team
        """
        try:
            send_mail(
                user_subject,
                user_message,
                f"TripPlanner <{settings.DEFAULT_FROM_EMAIL}>",
                [contact.email],
                fail_silently=True
            )
        except Exception as e:
            print(f"User mail error: {e}")
