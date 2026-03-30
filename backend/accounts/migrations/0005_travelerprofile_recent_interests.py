from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_travelerprofile_profile_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="travelerprofile",
            name="recent_interests",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
