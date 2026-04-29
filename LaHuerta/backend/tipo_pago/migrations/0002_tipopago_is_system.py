from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_pago', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipopago',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
