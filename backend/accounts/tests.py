from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient


class RegistrationLoginFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_guide_registration_creates_guide_profile_and_can_use_guide_login(self):
        response = self.client.post(
            "/accounts/register/",
            {
                "username": "guideuser",
                "email": "guide@example.com",
                "password": "StrongPass123",
                "role": "guide",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="guide@example.com")
        self.assertTrue(hasattr(user, "guide_profile"))
        self.assertFalse(hasattr(user, "traveler_profile"))

        login_response = self.client.post(
            "/accounts/guide/login/",
            {"email": "guide@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data["role"], "guide")
        self.assertTrue(login_response.data["token"])

    def test_traveler_registration_creates_traveler_profile_and_can_use_traveler_login(self):
        response = self.client.post(
            "/accounts/register/",
            {
                "username": "traveleruser",
                "email": "traveler@example.com",
                "password": "StrongPass123",
                "role": "traveler",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="traveler@example.com")
        self.assertTrue(hasattr(user, "traveler_profile"))
        self.assertFalse(hasattr(user, "guide_profile"))

        login_response = self.client.post(
            "/accounts/login/",
            {"email": "traveler@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data["role"], "traveler")

    def test_traveler_account_cannot_use_guide_login(self):
        self.client.post(
            "/accounts/register/",
            {
                "username": "traveleronly",
                "email": "traveleronly@example.com",
                "password": "StrongPass123",
                "role": "traveler",
            },
            format="json",
        )

        login_response = self.client.post(
            "/accounts/guide/login/",
            {"email": "traveleronly@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, 403)
