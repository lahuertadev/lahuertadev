from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_condicion_iva', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipocondicioniva',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
