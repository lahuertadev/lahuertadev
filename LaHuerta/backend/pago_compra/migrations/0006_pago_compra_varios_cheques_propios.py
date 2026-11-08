import django.db.models.deletion
from django.db import migrations, models


def move_own_check_to_uses(apps, schema_editor):
    '''Cada pago con cheque emitido pasa a una fila de la tabla intermedia, por el importe del pago.'''
    PagoCompra = apps.get_model('pago_compra', 'PagoCompra')
    PagoCompraChequePropio = apps.get_model('pago_compra', 'PagoCompraChequePropio')
    PagoCompraChequePropio.objects.bulk_create([
        PagoCompraChequePropio(
            pago_compra_id=payment.id,
            cheque_propio_id=payment.cheque_propio_id,
            importe=payment.importe_abonado,
        )
        for payment in PagoCompra.objects.filter(cheque_propio__isnull=False)
    ])


def move_uses_to_own_check(apps, schema_editor):
    '''Vuelta atrás: solo es posible si cada pago usa un único cheque emitido.'''
    PagoCompra = apps.get_model('pago_compra', 'PagoCompra')
    PagoCompraChequePropio = apps.get_model('pago_compra', 'PagoCompraChequePropio')
    for use in PagoCompraChequePropio.objects.all():
        if PagoCompraChequePropio.objects.filter(pago_compra_id=use.pago_compra_id).count() > 1:
            raise RuntimeError(
                f'El pago {use.pago_compra_id} usa varios cheques emitidos: no se puede volver a un cheque por pago.'
            )
        PagoCompra.objects.filter(id=use.pago_compra_id).update(cheque_propio_id=use.cheque_propio_id)


class Migration(migrations.Migration):
    '''
    DEV-141: un pago a proveedor puede usar varios cheques emitidos, y un cheque emitido
    repartirse entre varios pagos. La relación pasa a la tabla pago_compra_cheque_propio,
    con el importe que se usa de cada cheque en cada pago.
    '''

    dependencies = [
        ('pago_compra', '0005_pagocompra_proveedor_compra_opcional'),
        ('cheque_propio', '0006_owncheck_numero_deja_de_ser_pk'),
    ]

    operations = [
        # El FK viejo deja libre el nombre inverso pagocompra_set para la relación nueva.
        migrations.AlterField(
            model_name='pagocompra',
            name='cheque_propio',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='+',
                to='cheque_propio.owncheck',
            ),
        ),
        migrations.CreateModel(
            name='PagoCompraChequePropio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('importe', models.DecimalField(decimal_places=2, max_digits=10)),
                ('cheque_propio', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='payment_uses',
                    to='cheque_propio.owncheck',
                )),
                ('pago_compra', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='own_check_uses',
                    to='pago_compra.pagocompra',
                )),
            ],
            options={'db_table': 'pago_compra_cheque_propio'},
        ),
        migrations.AddConstraint(
            model_name='pagocomprachequepropio',
            constraint=models.UniqueConstraint(fields=('pago_compra', 'cheque_propio'), name='unique_own_check_per_payment'),
        ),
        migrations.AddField(
            model_name='pagocompra',
            name='cheques_propios',
            field=models.ManyToManyField(
                blank=True,
                through='pago_compra.PagoCompraChequePropio',
                to='cheque_propio.owncheck',
            ),
        ),
        migrations.RunPython(move_own_check_to_uses, move_uses_to_own_check),
        migrations.RemoveField(
            model_name='pagocompra',
            name='cheque_propio',
        ),
    ]
