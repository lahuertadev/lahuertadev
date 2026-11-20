import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models

# Estado de los cheques de clientes rechazados (catálogo estado_cheque). Va literal: las
# migraciones no importan constantes de la app.
REJECTED_STATE = 'RECHAZADO'


def _rejected_amount(Cheque, payment_id):
    '''Lo que valían los cheques de clientes del pago que ya se rechazaron.'''
    total = Cheque.objects.filter(
        pago_compra_id=payment_id,
        endosado=True,
        estado__descripcion=REJECTED_STATE,
    ).aggregate(total=models.Sum('importe'))['total']
    return total or Decimal('0')


def move_purchase_to_applications(apps, schema_editor):
    '''
    Cada pago con compra pasa a tener esa única compra por su importe; los pagos a cuenta
    quedan sin compras.

    Un pago con cheques de clientes ya rechazados baja su importe en lo que valían esos
    cheques: al rechazarlos la deuda ya se le devolvió al proveedor, pero el pago seguía
    con el importe original y la compra figuraba como pagada.
    '''
    PagoCompra = apps.get_model('pago_compra', 'PagoCompra')
    ImputacionPago = apps.get_model('pago_compra', 'ImputacionPago')
    Cheque = apps.get_model('cheque', 'Cheque')

    for payment in PagoCompra.objects.all():
        rejected = _rejected_amount(Cheque, payment.id)
        amount = max(payment.importe_abonado - rejected, Decimal('0'))
        if rejected:
            PagoCompra.objects.filter(id=payment.id).update(importe_abonado=amount)
        if payment.compra_id:
            ImputacionPago.objects.create(pago_compra_id=payment.id, compra_id=payment.compra_id, importe=amount)


def move_applications_to_purchase(apps, schema_editor):
    '''Vuelta atrás: solo es posible si cada pago cubre una única compra.'''
    PagoCompra = apps.get_model('pago_compra', 'PagoCompra')
    ImputacionPago = apps.get_model('pago_compra', 'ImputacionPago')
    Cheque = apps.get_model('cheque', 'Cheque')

    for payment in PagoCompra.objects.all():
        applications = list(ImputacionPago.objects.filter(pago_compra_id=payment.id))
        if len(applications) > 1:
            raise RuntimeError(
                f'El pago {payment.id} cubre varias compras: no se puede volver a una compra por pago.'
            )
        rejected = _rejected_amount(Cheque, payment.id)
        PagoCompra.objects.filter(id=payment.id).update(
            compra_id=applications[0].compra_id if applications else None,
            importe_abonado=payment.importe_abonado + rejected,
        )


class Migration(migrations.Migration):
    '''
    DEV-150: un pago a proveedor puede aplicarse a varias compras. La relación pasa a la
    tabla imputacion_pago, con el importe que se aplica a cada compra.
    '''

    dependencies = [
        ('pago_compra', '0006_pago_compra_varios_cheques_propios'),
        ('compra', '0003_fix_importe_bruto'),
        ('cheque', '0003_cheque_numero_deja_de_ser_pk'),
        ('estado_cheque', '0002_estadocheque_is_system'),
    ]

    operations = [
        # El FK viejo deja libre el nombre inverso pagocompra_set para la relación nueva.
        migrations.AlterField(
            model_name='pagocompra',
            name='compra',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='+',
                to='compra.compra',
            ),
        ),
        migrations.CreateModel(
            name='ImputacionPago',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('importe', models.DecimalField(decimal_places=2, max_digits=10)),
                ('compra', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payment_applications',
                    to='compra.compra',
                )),
                ('pago_compra', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='purchase_applications',
                    to='pago_compra.pagocompra',
                )),
            ],
            options={'db_table': 'imputacion_pago'},
        ),
        migrations.AddConstraint(
            model_name='imputacionpago',
            constraint=models.UniqueConstraint(fields=('pago_compra', 'compra'), name='unique_purchase_per_payment'),
        ),
        migrations.AddField(
            model_name='pagocompra',
            name='compras',
            field=models.ManyToManyField(
                blank=True,
                through='pago_compra.ImputacionPago',
                to='compra.compra',
            ),
        ),
        migrations.RunPython(move_purchase_to_applications, move_applications_to_purchase),
        migrations.RemoveField(
            model_name='pagocompra',
            name='compra',
        ),
    ]
