from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def populate_receivers(apps, schema_editor):
    ChatMessage = apps.get_model('guides', 'ChatMessage')

    for chat_message in ChatMessage.objects.select_related('booking', 'booking__guide__user', 'booking__traveler_user').all():
        booking = chat_message.booking
        if chat_message.sender_id == booking.guide.user_id:
            chat_message.receiver_id = booking.traveler_user_id
        elif chat_message.sender_id == booking.traveler_user_id:
            chat_message.receiver_id = booking.guide.user_id
        else:
            chat_message.receiver_id = booking.guide.user_id or booking.traveler_user_id
        chat_message.save(update_fields=['receiver'])


class Migration(migrations.Migration):

    dependencies = [
        ('guides', '0007_chatmessage'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmessage',
            name='receiver',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='received_booking_chat_messages',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(populate_receivers, migrations.RunPython.noop),
    ]
