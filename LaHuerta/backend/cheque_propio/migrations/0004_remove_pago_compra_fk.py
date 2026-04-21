from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cheque_propio', '0003_replace_proveedor_with_pago_compra'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='owncheck',
            name='pago_compra',
        ),
    ]
