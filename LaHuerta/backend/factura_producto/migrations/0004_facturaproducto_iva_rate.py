from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('factura_producto', '0003_facturaproducto_unique_producto_por_factura'),
    ]

    operations = [
        migrations.AddField(
            model_name='facturaproducto',
            name='iva_rate',
            field=models.DecimalField(decimal_places=2, default=10.5, max_digits=5),
        ),
    ]
