import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cheque', '0001_initial'),
        ('estado_cheque', '0001_initial'),
        ('pago_cliente', '0001_initial'),
        ('pago_compra', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(model_name='cheque', name='check_deposito'),
        migrations.RemoveField(model_name='cheque', name='acreditado'),
        migrations.RemoveField(model_name='cheque', name='check_pago_proveedor'),
        migrations.RemoveField(model_name='cheque', name='fecha_deposito_pago'),
        migrations.AddField(
            model_name='cheque',
            name='endosado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='cheque',
            name='fecha_endoso',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='cheque',
            name='estado',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='estado_cheque.estadocheque'),
        ),
        migrations.AddField(
            model_name='cheque',
            name='pago_cliente',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='pago_cliente.pagocliente'),
        ),
        migrations.AddField(
            model_name='cheque',
            name='pago_compra',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='pago_compra.pagocompra'),
        ),
    ]
