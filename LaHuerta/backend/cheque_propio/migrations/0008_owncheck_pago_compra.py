import django.db.models.deletion
from django.db import migrations, models

# Estados del pago. Van literales: las migraciones no importan constantes de la app.
CURRENT_PAYMENT_STATE = 'VIGENTE'


def link_current_payment(apps, schema_editor):
    '''Cada cheque emitido queda vinculado al pago vigente donde se usó, si tiene uno.'''
    PagoCompraChequePropio = apps.get_model('pago_compra', 'PagoCompraChequePropio')
    OwnCheck = apps.get_model('cheque_propio', 'OwnCheck')
    uses = PagoCompraChequePropio.objects.filter(pago_compra__estado_pago=CURRENT_PAYMENT_STATE)
    for use in uses:
        OwnCheck.objects.filter(id=use.cheque_propio_id).update(pago_compra_id=use.pago_compra_id)


class Migration(migrations.Migration):
    '''
    DEV-150: el cheque emitido se usa entero en un solo pago, igual que el de cliente. Vuelve a
    tener el pago en el que está usado (cheque_propio.pago_compra, como cheque.pago_compra), y
    pago_compra_cheque_propio queda como historial.
    '''

    dependencies = [
        ('cheque_propio', '0007_owncheck_estado_rechazado'),
        ('pago_compra', '0010_remove_pagocompra_cheques_propios'),
    ]

    operations = [
        migrations.AddField(
            model_name='owncheck',
            name='pago_compra',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='pago_compra.pagocompra',
            ),
        ),
        migrations.RunPython(link_current_payment, migrations.RunPython.noop),
    ]
