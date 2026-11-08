from django.db import migrations

# Tutorial de Pagos de Compras (DEV-141): elegir entre el pago de compras y el pago a cuenta, registrar
# el pago por el camino elegido y las acciones del listado. Cada paso resalta el elemento que la pantalla
# marca con data-tour="<elemento>"; el evento es el que emite el formulario al guardar (emitTutorialEvent).
#
# Tiene dos caminos: el paso de la selección pide ir a "Pago de compras", pero si el usuario elige
# "Pago a cuenta" el guía sigue por los pasos de esa ruta. El guardado de cada camino lleva
# ruta_destino al listado, para saltear lo que queda del otro camino.


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


LIST_ROUTE = '/purchase-payment'
SELECTION_ROUTE = '/purchase-payment/create'
PURCHASE_ROUTE = '/purchase-payment/create/purchase'
ON_ACCOUNT_ROUTE = '/purchase-payment/create/on-account'


def payment_steps(route):
    '''Datos del pago, iguales en los dos caminos: fecha, tipo de pago, cheques o importe, y guardar.'''
    return [
        step(route, 'payment-date', 'Fecha de pago', 'Por defecto es la de hoy. Cambiala si el pago es de otro día.',
             'next'),
        step(route, 'payment-type', 'Tipo de pago',
             'Elegí cómo pagás: efectivo, cheques de clientes o cheques emitidos. Un pago tiene un solo tipo: si pagás con varios, cargá un pago por cada uno.',
             'check', condicion='filled'),
        step(route, 'payment-check', 'Cheques',
             'Elegí los cheques con los que pagás; con "Agregar cheque" sumás otro. Los de clientes se usan enteros; de un cheque emitido indicás cuánto usás, y lo que quede sirve para otros pagos a este proveedor. El importe del pago es la suma.',
             'check', condicion='complete', opcional=True),
        step(route, 'payment-amount', 'Importe', 'Escribí cuánto pagás. Después tocá Continuar.',
             'check', condicion='filled', confirmar=True, opcional=True),
        step(route, 'form-confirm', 'Registrar el pago',
             'Revisá los datos y tocá "Registrar pago". El importe se descuenta de la cuenta corriente del proveedor.',
             'event', evento='purchase-payment-created', ruta_destino=LIST_ROUTE),
    ]


TUTORIAL = {
    'clave': 'purchase-payments',
    'titulo': 'Pagos de Compras',
    'descripcion': 'Cómo registrar un pago a un proveedor, de una compra o a cuenta de su saldo, y qué podés hacer desde el listado.',
    'seccion': 'Proveedores',
    'orden': 7,
    'pasos': [
        step(LIST_ROUTE, 'list-add', 'Nuevo pago', 'Tocá "Nuevo pago" para registrar un pago a un proveedor.',
             'route', ruta_destino=SELECTION_ROUTE),
        step(SELECTION_ROUTE, 'payment-kind-on-account', 'Pago a cuenta',
             'Para pagar parte del saldo del proveedor sin asociarlo a una compra: por ejemplo, su saldo inicial o un adelanto. Se descuenta de su cuenta corriente.',
             'next', solo_lectura=True),
        step(SELECTION_ROUTE, 'payment-kinds', 'Elegí el pago',
             'Pago de compras es para pagar una compra cargada en el sistema. Tocá el que vas a registrar: el tutorial sigue con ese.',
             'route', ruta_destino=PURCHASE_ROUTE),
        # Camino "Pago de compras".
        step(PURCHASE_ROUTE, 'payment-buy', 'Compra',
             'Elegí la compra que vas a pagar. Abajo vas a ver su importe y el saldo que le falta pagar.',
             'check', condicion='complete'),
        *payment_steps(PURCHASE_ROUTE),
        # Camino "Pago a cuenta".
        step(ON_ACCOUNT_ROUTE, 'payment-supplier', 'Proveedor',
             'Elegí el proveedor al que le pagás. Al lado vas a ver lo que le debés hoy, incluido su saldo inicial.',
             'check', condicion='complete'),
        *payment_steps(ON_ACCOUNT_ROUTE),
        # Listado, al final de los dos caminos.
        step(LIST_ROUTE, 'grid-detail', 'Ver el detalle', 'Con la lupa de la columna Acción abrís el detalle del pago.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
        step(LIST_ROUTE, 'grid-edit', 'Editar',
             'Con el lápiz corregís la fecha del pago, y también el importe si no se pagó con cheques. La diferencia se ajusta sola en la cuenta corriente del proveedor.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(LIST_ROUTE, 'grid-delete', 'Eliminar',
             'Con el tacho eliminás el pago: el importe vuelve a la cuenta corriente del proveedor y los cheques quedan libres. Antes de borrar, el sistema te pide confirmación.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(LIST_ROUTE, 'grid-row', 'Ver, editar o eliminar', 'Tocá una fila para abrir el detalle del pago: desde ahí podés editarlo o eliminarlo.',
             'next', dispositivo='mobile', solo_lectura=True),
    ],
}


def create_tutorial(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    data = dict(TUTORIAL)
    steps = data.pop('pasos')
    tutorial = Tutorial.objects.create(**data)
    TutorialPaso.objects.bulk_create([
        TutorialPaso(tutorial=tutorial, orden=step_order, **step_data)
        for step_order, step_data in enumerate(steps, start=1)
    ])


def delete_tutorial(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Tutorial.objects.filter(clave=TUTORIAL['clave']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tutorial', '0006_tutorial_clientes_contactos'),
    ]

    operations = [
        migrations.RunPython(create_tutorial, delete_tutorial),
    ]
