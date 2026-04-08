from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('factura_producto', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='facturaproducto',
            name='precio_unitario',
        ),
        migrations.RemoveField(
            model_name='facturaproducto',
            name='precio_bulto',
        ),
        migrations.AddField(
            model_name='facturaproducto',
            name='precio_aplicado',
            field=models.DecimalField(max_digits=10, decimal_places=2),
        ),
    ]
