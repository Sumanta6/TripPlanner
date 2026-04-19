import base64
import hashlib
import hmac
import json
from datetime import date, timedelta
from unittest.mock import Mock, patch

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

    def initiate_payment_url(self, booking_id):
        return f"/api/guides/bookings/{booking_id}/payment/initiate/"

    def verify_payment_url(self):
        return "/api/guides/bookings/payment/verify/"

    def esewa_callback_url(self, query=""):
        suffix = f"?{query}" if query else ""
        return f"/api/guides/bookings/payment/callback/{suffix}"

    def esewa_callback_path_url(self, flow, booking_id, guide_id, transaction_uuid, total_amount, query=""):
        suffix = f"?{query}" if query else ""
        return f"/api/guides/bookings/payment/callback/{flow}/{booking_id}/{guide_id}/{transaction_uuid}/{total_amount}/{suffix}"

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

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:3000/payment/callback?status=success",
        ESEWA_FAILURE_URL="http://localhost:3000/payment/callback?status=failure",
    )
    def test_initiate_payment_returns_payment_url_and_form_payload(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        payment = booking.payment
        self.assertEqual(response.data["payment_url"], "https://rc-epay.esewa.com.np/api/epay/main/v2/form")
        self.assertEqual(response.data["form_data"]["product_code"], "EPAYTEST")
        self.assertEqual(response.data["form_data"]["signed_field_names"], "total_amount,transaction_uuid,product_code")
        self.assertEqual(payment.status, "pending")
        self.assertTrue(payment.transaction_id)
        self.assertEqual(response.data["form_data"]["transaction_uuid"], payment.transaction_id)
        self.assertIn(f"/success/{booking.id}/{self.guide.id}/{payment.transaction_id}/220.00/", response.data["form_data"]["success_url"])
        self.assertIn(f"/failure/{booking.id}/{self.guide.id}/{payment.transaction_id}/220.00/", response.data["form_data"]["failure_url"])

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:3000/payment/callback?status=success",
        ESEWA_FAILURE_URL="http://localhost:3000/payment/callback?status=failure",
    )
    def test_initiate_payment_creates_missing_payment_record_for_valid_draft(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(booking=booking)
        self.assertEqual(payment.status, "pending")
        self.assertEqual(response.data["payment_status"], "pending")

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:3000/payment/callback?status=success",
        ESEWA_FAILURE_URL="http://localhost:3000/payment/callback?status=failure",
    )
    def test_initiate_payment_returns_clear_error_when_config_missing(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "eSewa payment is not configured correctly. Missing settings: ESEWA_SECRET_KEY.",
        )
        self.assertIn("ESEWA_SECRET_KEY", response.data["missing_fields"])
        self.assertEqual(response.data["error_code"], "payment_config_missing")

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
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["error"], "This booking has already been paid.")
        self.assertEqual(response.data["error_code"], "already_paid")

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:3000/payment/callback?status=success",
        ESEWA_FAILURE_URL="http://localhost:3000/payment/callback?status=failure",
    )
    @patch("guides.views.requests.get")
    def test_verify_payment_moves_booking_to_pending(self, mock_get):
        booking = self.create_booking(self.traveler, "payment_pending")
        payment = Payment.objects.create(
            booking=booking,
            amount=220,
            status="pending",
            payment_method="esewa",
            transaction_id="booking-1-abcdef123456",
        )
        self.client.force_authenticate(self.traveler)
        mock_response = Mock()
        mock_response.json.return_value = {"status": "COMPLETE"}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        payload = {
            "transaction_uuid": payment.transaction_id,
            "total_amount": "220.00",
            "status": "COMPLETE",
        }
        encoded_payload = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")

        response = self.client.post(
            self.verify_payment_url(),
            {"data": encoded_payload},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, "pending")
        self.assertEqual(payment.status, "paid")
        self.assertEqual(response.data["booking"]["status"], "pending")

    def test_verify_failed_payment_keeps_booking_retryable(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        payment = Payment.objects.create(
            booking=booking,
            amount=220,
            status="pending",
            payment_method="esewa",
            transaction_id="booking-1-abcdef123456",
        )
        self.client.force_authenticate(self.traveler)

        payload = {
            "transaction_uuid": payment.transaction_id,
            "total_amount": "220.00",
            "status": "FAILED",
        }
        encoded_payload = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")

        response = self.client.post(
            self.verify_payment_url(),
            {"data": encoded_payload},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, "payment_pending")
        self.assertEqual(payment.status, "failed")
        self.assertEqual(response.data["status"], "failed")

    def test_initiate_payment_rejects_non_owner(self):
        booking = self.create_booking(self.other_traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error_code"], "forbidden_booking")

    def test_initiate_payment_rejects_cancelled_booking_with_clear_reason(self):
        booking = self.create_booking(self.traveler, "cancelled")
        Payment.objects.create(booking=booking, amount=220, status="failed", payment_method="esewa")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error_code"], "booking_cancelled")
        self.assertEqual(response.data["next_action"], "request_again")

    def test_initiate_payment_rejects_pending_booking_as_not_payable(self):
        booking = self.create_booking(self.traveler, "pending")
        Payment.objects.create(booking=booking, amount=220, status="paid", payment_method="esewa", transaction_id="paid-123")
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["error_code"], "already_paid")
        self.assertEqual(response.data["next_action"], "view_profile")

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:3000/payment/callback?status=success",
        ESEWA_FAILURE_URL="http://localhost:3000/payment/callback?status=failure",
    )
    def test_initiate_payment_retries_failed_payment_with_same_payment_record(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        payment = Payment.objects.create(
            booking=booking,
            amount=220,
            status="failed",
            payment_method="esewa",
            transaction_id="stale-transaction",
        )
        self.client.force_authenticate(self.traveler)

        response = self.client.post(
            self.initiate_payment_url(booking.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.id, booking.payment.id)
        self.assertEqual(payment.status, "pending")
        self.assertNotEqual(payment.transaction_id, "stale-transaction")

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:8000/api/guides/bookings/payment/callback/success/",
        ESEWA_FAILURE_URL="http://localhost:8000/api/guides/bookings/payment/callback/failure/",
        ESEWA_FRONTEND_CALLBACK_URL="http://localhost:3000/payment/callback",
    )
    @patch("guides.views.requests.get")
    def test_esewa_callback_redirects_success_with_normalized_payload(self, mock_get):
        booking = self.create_booking(self.traveler, "payment_pending")
        payment = Payment.objects.create(
            booking=booking,
            amount=220,
            status="pending",
            payment_method="esewa",
            transaction_id="booking-1-abcdef123456",
        )
        mock_response = Mock()
        mock_response.json.return_value = {"status": "COMPLETE"}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        payload = {
            "transaction_uuid": payment.transaction_id,
            "total_amount": "220.00",
            "status": "COMPLETE",
        }
        encoded_payload = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")

        response = self.client.get(
            self.esewa_callback_path_url("success", booking.id, self.guide.id, payment.transaction_id, "220.00", query="data=" + encoded_payload)
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("status=success", response["Location"])
        self.assertIn(f"booking_id={booking.id}", response["Location"])
        self.assertIn(f"guide_id={self.guide.id}", response["Location"])

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:8000/api/guides/bookings/payment/callback/success/",
        ESEWA_FAILURE_URL="http://localhost:8000/api/guides/bookings/payment/callback/failure/",
        ESEWA_FRONTEND_CALLBACK_URL="http://localhost:3000/payment/callback",
    )
    def test_esewa_callback_uses_signed_complete_payload_without_status_api(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(
            booking=booking,
            amount=220,
            status="pending",
            payment_method="esewa",
            transaction_id="booking-1-abcdef123456",
        )
        signed_fields = "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names"
        payload = {
            "transaction_code": "000AWEO",
            "status": "COMPLETE",
            "total_amount": "220.00",
            "transaction_uuid": "booking-1-abcdef123456",
            "product_code": "EPAYTEST",
            "signed_field_names": signed_fields,
        }
        message = ",".join(f"{field}={payload[field]}" for field in signed_fields.split(","))
        payload["signature"] = base64.b64encode(
            hmac.new(b"test-secret", message.encode("utf-8"), hashlib.sha256).digest()
        ).decode("utf-8")
        encoded_payload = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")

        response = self.client.get(
            self.esewa_callback_path_url("success", booking.id, self.guide.id, booking.payment.transaction_id, "220.00", query="data=" + encoded_payload)
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("status=success", response["Location"])
        booking.refresh_from_db()
        self.assertEqual(booking.status, "pending")
        self.assertEqual(booking.payment.status, "paid")

    @override_settings(
        ESEWA_MERCHANT_ID="EPAYTEST",
        ESEWA_SECRET_KEY="test-secret",
        ESEWA_PAYMENT_URL="https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        ESEWA_STATUS_URL="https://rc.esewa.com.np/api/epay/transaction/status/",
        ESEWA_SUCCESS_URL="http://localhost:8000/api/guides/bookings/payment/callback/success/",
        ESEWA_FAILURE_URL="http://localhost:8000/api/guides/bookings/payment/callback/failure/",
        ESEWA_FRONTEND_CALLBACK_URL="http://localhost:3000/payment/callback",
    )
    @patch("guides.views.requests.get")
    def test_esewa_callback_flow_failure_can_still_verify_complete(self, mock_get):
        booking = self.create_booking(self.traveler, "payment_pending")
        payment = Payment.objects.create(
            booking=booking,
            amount=220,
            status="pending",
            payment_method="esewa",
            transaction_id="booking-1-abcdef123456",
        )
        mock_response = Mock()
        mock_response.json.return_value = {"status": "COMPLETE"}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        response = self.client.get(
            self.esewa_callback_path_url("failure", booking.id, self.guide.id, payment.transaction_id, "220.00")
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("status=success", response["Location"])
        payment.refresh_from_db()
        self.assertEqual(payment.status, "paid")

    def test_esewa_callback_redirects_failed_when_failure_payload_missing(self):
        response = self.client.get(
            self.esewa_callback_path_url("failure", 64, 4, "booking-64-abcdef123456", "1000.00")
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("status=failed", response["Location"])
        self.assertIn("status_code=missing_failure_details", response["Location"])

    def test_esewa_callback_redirects_failed_when_success_payload_missing(self):
        response = self.client.get(
            self.esewa_callback_path_url("success", 64, 4, "booking-64-abcdef123456", "1000.00")
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("status=failed", response["Location"])
        self.assertIn("status_code=missing_success_details", response["Location"])

    def test_guide_list_excludes_payment_pending_drafts(self):
        booking = self.create_booking(self.traveler, "payment_pending")
        Payment.objects.create(booking=booking, amount=220, status="pending", payment_method="esewa")
        self.client.force_authenticate(self.guide_user)

        response = self.client.get("/api/guides/me/bookings/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
