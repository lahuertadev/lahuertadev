from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_facturacion', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipofacturacion',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
