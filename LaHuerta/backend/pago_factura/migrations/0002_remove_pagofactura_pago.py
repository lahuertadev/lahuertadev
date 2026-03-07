from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('pago_factura', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='pagofactura',
            name='pago',
        ),
    ]
