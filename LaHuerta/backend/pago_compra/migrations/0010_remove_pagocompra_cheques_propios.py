from django.db import migrations


class Migration(migrations.Migration):
    '''
    DEV-150: el pago deja de tener la relación muchos a muchos con los cheques emitidos. El pago
    en el que está usado un cheque lo indica cheque_propio.pago_compra, y pago_compra_cheque_propio
    queda como historial. Solo cambia el modelo: la tabla no se toca.
    '''

    dependencies = [
        ('pago_compra', '0009_pago_compra_cheque'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='pagocompra',
            name='cheques_propios',
        ),
    ]
