import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pago_compra', '0001_initial'),
        ('tipo_pago', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagocompra',
            name='tipo_pago',
            field=models.ForeignKey(
                default=1,
                on_delete=django.db.models.deletion.PROTECT,
                to='tipo_pago.tipopago',
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='pagocompra',
            name='fecha_pago',
            field=models.DateField(default='2024-01-01'),
            preserve_default=False,
        ),
    ]
