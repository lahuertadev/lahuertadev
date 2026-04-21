import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pago_compra', '0002_add_tipo_pago_fecha_pago'),
        ('cheque_propio', '0004_remove_pago_compra_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagocompra',
            name='cheque_propio',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='cheque_propio.owncheck',
            ),
        ),
    ]
