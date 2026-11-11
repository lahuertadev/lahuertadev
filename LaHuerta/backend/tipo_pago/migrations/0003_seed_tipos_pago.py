from django.db import migrations

# Tipos de pago del sistema. Hasta ahora solo existían en fixtures/initial_data.json, que el
# deploy no carga: en producción la tabla quedaba vacía y no se podía registrar ningún pago.
# Las descripciones van escritas literal (una migración no importa constantes de la app) y
# tienen que coincidir con tipo_pago/constants.py, que es lo que compara la lógica de pagos.
SYSTEM_PAYMENT_TYPES = [
    'Efectivo',
    'Transferencia',
    'Cheque',
    'Débito',
    'Crédito',
    'Mercado Pago',
    'Cuenta Corr.',
    'Pagaré',
    'Cheque Propio',
]


def create_payment_types(apps, schema_editor):
    '''
    Crea los tipos de pago que falten y marca como de sistema los que ya existían,
    sin duplicarlos ni cambiar sus ids (los pagos ya registrados los siguen referenciando).
    '''
    TipoPago = apps.get_model('tipo_pago', 'TipoPago')
    for description in SYSTEM_PAYMENT_TYPES:
        TipoPago.objects.update_or_create(descripcion=description, defaults={'is_system': True})


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_pago', '0002_tipopago_is_system'),
    ]

    operations = [
        # La reversa no borra: los tipos de pago pueden estar referenciados por pagos.
        migrations.RunPython(create_payment_types, migrations.RunPython.noop),
    ]
