from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Trip, TravelerProfile
from guides.models import GuideProfile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["traveler", "guide"],
        default="traveler",
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = ["username", "email", "password", "role"]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken")
        return value

    def create(self, validated_data):
        role = validated_data.pop("role", "traveler")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        UserProfile.objects.create(user=user)
        if role == "guide":
            GuideProfile.objects.create(
                user=user,
                full_name=user.username,
                email=user.email,
            )
        else:
            TravelerProfile.objects.create(
                user=user,
                full_name=user.username,
            )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["phone", "country"]


class TravelerProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TravelerProfile
        fields = [
            "user_id",
            "email",
            "full_name",
            "phone",
            "address",
            "bio",
            "preferred_destinations",
            "travel_style",
            "recent_interests",
        ]


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = ["user"]
