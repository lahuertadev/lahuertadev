from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_unidad', '0004_alter_tipounidad_tipo_medicion'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipounidad',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
