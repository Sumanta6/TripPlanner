from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from guides.models import Booking, GuideProfile, Payment


@override_settings(ALLOWED_HOSTS=["localhost", "127.0.0.1", "testserver"])
class CancelBookingApiTests(APITestCase):
    def setUp(self):
        self.guide_user = User.objects.create_user(
            username="guide-one",
            email="guide@example.com",
            password="password123",
        )
        self.guide = GuideProfile.objects.create(
            user=self.guide_user,
            full_name="Guide One",
            availability="available",
        )

        self.traveler = User.objects.create_user(
            username="traveler-one",
            email="traveler@example.com",
            password="password123",
        )
        self.other_traveler = User.objects.create_user(
            username="traveler-two",
            email="traveler2@example.com",
            password="password123",
        )

        self.base_start = date.today() + timedelta(days=7)
        self.base_end = self.base_start + timedelta(days=2)

    def create_booking(self, traveler, status_value="pending", **overrides):
        return Booking.objects.create(
            guide=self.guide,
            traveler_user=traveler,
            traveler_name=traveler.username,
            traveler_email=traveler.email,
            destination=overrides.pop("destination", "Pokhara"),
            trip_start=overrides.pop("trip_start", self.base_start),
            trip_end=overrides.pop("trip_end", self.base_end),
            status=status_value,
            **overrides,
        )

    def cancel_url(self, booking_id):
        return f"/api/guides/bookings/{booking_id}/cancel/"

    def guide_status_url(self, booking_id):
        return f"/api/guides/me/bookings/{booking_id}/status/"

    def guide_detail_url(self, guide_id, query=""):
        suffix = f"?{query}" if query else ""
        return f"/api/guides/{guide_id}/{suffix}"

    def request_url(self, guide_id):
        return f"/api/guides/{guide_id}/request/"

    def confirm_payment_url(self, booking_id):
        return f"/api/guides/bookings/{booking_id}/payment/confirm/"

    def test_traveler_can_cancel_pending_booking(self):
        booking = self.create_booking(self.traveler, "pending")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.cancel_url(booking.id),
            {"reason_code": "change_of_plans"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "cancelled")
        self.assertEqual(response.data["status"], "cancelled")
        self.assertFalse(response.data["can_cancel"])
        self.assertEqual(response.data["status_reason_code"], "change_of_plans")
        self.assertEqual(response.data["status_updated_by_role"], "traveler")

    def test_traveler_can_cancel_accepted_booking(self):
        booking = self.create_booking(self.traveler, "accepted")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.cancel_url(booking.id),
            {"reason_code": "other", "reason_note": "Need to postpone this trip."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "cancelled")
        self.assertEqual(booking.status_reason_note, "Need to postpone this trip.")

    def test_traveler_cannot_cancel_completed_booking(self):
        booking = self.create_booking(self.traveler, "completed")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.cancel_url(booking.id),
            {"reason_code": "change_of_plans"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "completed")
        booking.refresh_from_db()
        self.assertEqual(booking.status, "completed")

    def test_traveler_cannot_cancel_other_travelers_booking(self):
        booking = self.create_booking(self.other_traveler, "pending")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.cancel_url(booking.id),
            {"reason_code": "change_of_plans"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_guide_cannot_cancel_booking_through_traveler_endpoint(self):
        booking = self.create_booking(self.traveler, "accepted")
        self.client.force_authenticate(self.guide_user)

        response = self.client.post(
            self.cancel_url(booking.id),
            {"reason_code": "change_of_plans"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_traveler_cancel_requires_reason(self):
        booking = self.create_booking(self.traveler, "pending")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(self.cancel_url(booking.id), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "A cancellation reason is required.")

    def test_guide_can_reject_pending_booking_with_reason(self):
        booking = self.create_booking(self.traveler, "pending")
        self.client.force_authenticate(self.guide_user)

        response = self.client.patch(
            self.guide_status_url(booking.id),
            {"status": "rejected", "reason_code": "schedule_conflict"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "rejected")
        self.assertEqual(booking.status_reason_code, "schedule_conflict")
        self.assertEqual(booking.status_updated_by_role, "guide")

    def test_guide_can_cancel_active_booking_with_reason(self):
        booking = self.create_booking(self.traveler, "active")
        self.client.force_authenticate(self.guide_user)

        response = self.client.patch(
            self.guide_status_url(booking.id),
            {"status": "cancelled", "reason_code": "personal_reason"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "cancelled")
        self.assertEqual(booking.status_reason_code, "personal_reason")

    def test_guide_cannot_cancel_pending_booking(self):
        booking = self.create_booking(self.traveler, "pending")
        self.client.force_authenticate(self.guide_user)

        response = self.client.patch(
            self.guide_status_url(booking.id),
            {"status": "cancelled", "reason_code": "schedule_conflict"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_booking_is_history_and_allows_new_request(self):
        cancelled_booking = self.create_booking(
            self.traveler,
            "cancelled",
            status_reason_code="change_of_plans",
            status_updated_by_role="traveler",
        )
        self.client.force_authenticate(self.traveler)

        response = self.client.get(
            self.guide_detail_url(
                self.guide.id,
                query=f"trip_start={self.base_start.isoformat()}&trip_end={self.base_end.isoformat()}",
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["current_traveler_booking"])
        self.assertEqual(response.data["latest_traveler_booking"]["id"], cancelled_booking.id)
        self.assertTrue(response.data["can_request_now"])

    def test_overlapping_pending_booking_blocks_new_request(self):
        blocking_booking = self.create_booking(self.traveler, "pending")
        self.client.force_authenticate(self.traveler)

        response = self.client.get(
            self.guide_detail_url(
                self.guide.id,
                query=f"trip_start={self.base_start.isoformat()}&trip_end={self.base_end.isoformat()}",
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_traveler_booking"]["id"], blocking_booking.id)
        self.assertFalse(response.data["can_request_now"])

    def test_request_endpoint_allows_rebooking_after_cancellation(self):
        self.create_booking(
            self.traveler,
            "cancelled",
            trip_start=self.base_start,
            trip_end=self.base_end,
            status_reason_code="personal_reason",
            status_updated_by_role="traveler",
        )
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.request_url(self.guide.id),
            {
                "destination": "Pokhara",
                "trip_start": self.base_start.isoformat(),
                "trip_end": self.base_end.isoformat(),
                "notes": "Retrying after cancellation.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.filter(traveler_user=self.traveler, guide=self.guide).count(), 2)
        self.assertEqual(response.data["status"], "payment_pending")
        self.assertEqual(response.data["payment_status"], "pending")

    def test_request_endpoint_blocks_overlapping_pending_booking(self):
        self.create_booking(self.traveler, "pending")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.request_url(self.guide.id),
            {
                "destination": "Pokhara",
                "trip_start": self.base_start.isoformat(),
                "trip_end": self.base_end.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "You already have a payment, active, or pending booking with this guide for the selected dates.",
        )

    def test_request_endpoint_creates_payment_pending_booking(self):
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.request_url(self.guide.id),
            {
                "destination": "Pokhara",
                "trip_start": self.base_start.isoformat(),
                "trip_end": self.base_end.isoformat(),
                "notes": "Please help with the route.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get(pk=response.data["id"])
        payment = Payment.objects.get(booking=booking)
        self.assertEqual(booking.status, "payment_pending")
        self.assertEqual(payment.status, "pending")
        self.assertEqual(response.data["payment_status"], "pending")
        self.assertTrue(response.data["requires_payment"])
        self.assertTrue(response.data["can_retry_payment"])

    def test_payment_confirmation_moves_booking_to_pending(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.confirm_payment_url(booking.id),
            {"status": "paid", "payment_method": "esewa"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        payment = booking.payment
        self.assertEqual(booking.status, "pending")
        self.assertEqual(payment.status, "paid")
        self.assertTrue(payment.transaction_id)
        self.assertEqual(response.data["booking"]["status"], "pending")

    def test_failed_payment_keeps_booking_retryable(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.confirm_payment_url(booking.id),
            {"status": "failed", "payment_method": "esewa"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        payment = booking.payment
        self.assertEqual(booking.status, "payment_pending")
        self.assertEqual(payment.status, "failed")
        self.assertEqual(response.data["booking"]["payment_status"], "failed")
        self.assertTrue(response.data["booking"]["can_retry_payment"])

    def test_duplicate_paid_confirmation_is_rejected(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(
            booking=booking,
            amount=220,
            status="paid",
            payment_method="esewa",
            transaction_id="TP-ESW-PAID123",
        )
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.confirm_payment_url(booking.id),
            {"status": "paid", "payment_method": "esewa"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "This booking has already been paid.")

    def test_guide_list_excludes_payment_pending_drafts(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.guide_user)

        response = self.client.get("/api/guides/me/bookings/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
