from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_factura', '0004_tipofactura_is_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipofactura',
            name='codigo_afip',
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
