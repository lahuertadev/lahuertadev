import django.db.models.deletion
from django.db import migrations, models


def fill_supplier_from_purchase(apps, schema_editor):
    PagoCompra = apps.get_model('pago_compra', 'PagoCompra')
    for payment in PagoCompra.objects.select_related('compra').filter(proveedor__isnull=True):
        payment.proveedor_id = payment.compra.proveedor_id
        payment.save(update_fields=['proveedor'])


class Migration(migrations.Migration):
    '''
    DEV-141: un pago a proveedor puede no tener compra (pago a cuenta).
    El proveedor pasa a guardarse en el pago y la compra pasa a ser opcional.
    Los pagos existentes toman el proveedor de su compra.
    '''

    dependencies = [
        ('pago_compra', '0004_cheque_propio_fk_apunta_a_id'),
        ('proveedor', '0005_remove_telefono'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagocompra',
            name='proveedor',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='proveedor.proveedor',
            ),
        ),
        migrations.RunPython(fill_supplier_from_purchase, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='pagocompra',
            name='proveedor',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='proveedor.proveedor',
            ),
        ),
        migrations.AlterField(
            model_name='pagocompra',
            name='compra',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='compra.compra',
            ),
        ),
    ]
