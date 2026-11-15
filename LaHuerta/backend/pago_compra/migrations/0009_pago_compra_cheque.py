import django.db.models.deletion
from django.db import migrations, models


def record_endorsed_checks(apps, schema_editor):
    '''
    Cada cheque de cliente que hoy está endosado a un pago queda registrado en ese pago, con el
    importe que valía.
    '''
    Cheque = apps.get_model('cheque', 'Cheque')
    PagoCompraCheque = apps.get_model('pago_compra', 'PagoCompraCheque')
    PagoCompraCheque.objects.bulk_create([
        PagoCompraCheque(
            pago_compra_id=check.pago_compra_id,
            cheque_id=check.id,
            importe=check.importe,
        )
        for check in Cheque.objects.filter(pago_compra__isnull=False)
    ])


class Migration(migrations.Migration):
    '''
    DEV-150: registro de los cheques de clientes de cada pago a proveedor (pago_compra_cheque). Al
    anular un pago, sus cheques vuelven a cartera pero el pago sigue mostrando con cuáles se registró.
    '''

    dependencies = [
        ('pago_compra', '0008_pago_compra_anulacion'),
        ('cheque', '0003_cheque_numero_deja_de_ser_pk'),
    ]

    operations = [
        migrations.CreateModel(
            name='PagoCompraCheque',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('importe', models.DecimalField(decimal_places=2, max_digits=10)),
                ('cheque', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='purchase_payment_uses',
                    to='cheque.cheque',
                )),
                ('pago_compra', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='client_check_uses',
                    to='pago_compra.pagocompra',
                )),
            ],
            options={'db_table': 'pago_compra_cheque'},
        ),
        migrations.AddConstraint(
            model_name='pagocompracheque',
            constraint=models.UniqueConstraint(fields=('pago_compra', 'cheque'), name='unique_client_check_per_payment'),
        ),
        migrations.RunPython(record_endorsed_checks, migrations.RunPython.noop),
    ]
