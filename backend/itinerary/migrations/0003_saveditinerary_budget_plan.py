# Generated manually because Django is not installed in the local Codex runtime.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("itinerary", "0002_saveditinerary_budget_saveditinerary_travelers_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="saveditinerary",
            name="budget_plan",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
