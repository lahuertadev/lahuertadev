from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_contenedor', '0003_tipocontenedor_requiere_vacio'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipocontenedor',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
