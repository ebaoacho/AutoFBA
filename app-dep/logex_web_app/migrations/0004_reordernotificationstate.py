from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('logex_web_app', '0003_chatworkroom_owner_skuconfig_owner'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReorderNotificationState',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sku', models.CharField(db_index=True, max_length=30)),
                ('is_active', models.BooleanField(default=False)),
                ('current_inventory', models.IntegerField(default=0)),
                ('delivery_point', models.IntegerField(default=0)),
                ('recommended_delivery_quantity', models.IntegerField(default=0)),
                ('last_transition_at', models.DateTimeField(auto_now=True)),
                ('last_notified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reorder_notification_states', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('owner', 'sku')},
            },
        ),
        migrations.AddIndex(
            model_name='reordernotificationstate',
            index=models.Index(fields=['owner', 'sku', 'is_active'], name='logex_web_a_owner_i_3ec0f6_idx'),
        ),
    ]
