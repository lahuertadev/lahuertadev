from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('pago_compra', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='pagocompra',
            name='pago',
        ),
        migrations.RemoveField(
            model_name='pagocompra',
            name='fecha_pago',
        ),
    ]
