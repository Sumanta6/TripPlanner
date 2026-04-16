from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guides', '0008_chatmessage_receiver'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='status_reason_code',
            field=models.CharField(
                blank=True,
                choices=[
                    ('change_of_plans', 'Change of plans'),
                    ('found_another_option', 'Found another option'),
                    ('schedule_conflict', 'Schedule conflict'),
                    ('price_issue', 'Price issue'),
                    ('personal_reason', 'Personal reason'),
                    ('other', 'Other'),
                ],
                default='',
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='status_reason_note',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='status_updated_by_role',
            field=models.CharField(
                blank=True,
                choices=[
                    ('traveler', 'Traveler'),
                    ('guide', 'Guide'),
                    ('admin', 'Admin'),
                    ('system', 'System'),
                ],
                default='',
                max_length=20,
            ),
        ),
    ]
