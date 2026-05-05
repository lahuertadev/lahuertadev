from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_factura', '0003_tipofactura_abreviatura_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipofactura',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
