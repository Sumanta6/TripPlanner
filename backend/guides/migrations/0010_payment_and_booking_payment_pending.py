from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("guides", "0009_booking_status_reason_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("payment_pending", "Payment Pending"),
                    ("pending", "Pending"),
                    ("accepted", "Accepted"),
                    ("active", "Active"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                    ("rejected", "Rejected"),
                    ("auto_rejected", "Auto Rejected"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("paid", "Paid"), ("failed", "Failed")], default="pending", max_length=20)),
                ("payment_method", models.CharField(choices=[("esewa", "eSewa")], default="esewa", max_length=30)),
                ("transaction_id", models.CharField(blank=True, default="", max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("booking", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payment", to="guides.booking")),
            ],
            options={
                "verbose_name": "Payment",
                "verbose_name_plural": "Payments",
                "ordering": ["-created_at"],
            },
        ),
    ]
