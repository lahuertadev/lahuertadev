from django.db import migrations

# Tutorial de Pagos de Compras (DEV-141): elegir entre el pago de compras y el pago a cuenta, registrar
# el pago de una compra y las acciones del listado. Cada paso resalta el elemento que la pantalla marca
# con data-tour="<elemento>"; el evento es el que emite el formulario al guardar (emitTutorialEvent).


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


LIST_ROUTE = '/purchase-payment'
SELECTION_ROUTE = '/purchase-payment/create'
FORM_ROUTE = '/purchase-payment/create/purchase'

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
        step(SELECTION_ROUTE, 'payment-kind-purchase', 'Pago de compras',
             'Para pagar una compra cargada en el sistema. Tocá "Pago de compras" para seguir.',
             'route', ruta_destino=FORM_ROUTE),
        step(FORM_ROUTE, 'payment-buy', 'Compra',
             'Elegí la compra que vas a pagar. Abajo vas a ver su importe y el saldo que le falta pagar.',
             'check', condicion='complete'),
        step(FORM_ROUTE, 'payment-date', 'Fecha de pago', 'Por defecto es la de hoy. Cambiala si el pago es de otro día.',
             'next'),
        step(FORM_ROUTE, 'payment-type', 'Tipo de pago', 'Elegí cómo pagás: efectivo, un cheque de un cliente o un cheque emitido.',
             'check', condicion='filled'),
        step(FORM_ROUTE, 'payment-check', 'Cheque',
             'Elegí el cheque con el que pagás. Un cheque emitido se usa con un solo proveedor: lo que no uses ahora queda para otros pagos a ese proveedor.',
             'check', condicion='complete', opcional=True),
        step(FORM_ROUTE, 'payment-amount', 'Importe', 'Escribí cuánto pagás. No puede superar el saldo pendiente de la compra. Después tocá Continuar.',
             'check', condicion='filled', confirmar=True),
        step(FORM_ROUTE, 'form-confirm', 'Registrar el pago',
             'Revisá los datos y tocá "Registrar pago". El importe se descuenta de la cuenta corriente del proveedor y la compra pasa a parcial o abonada.',
             'event', evento='purchase-payment-created'),
        step(LIST_ROUTE, 'grid-detail', 'Ver el detalle', 'Con la lupa de cada fila abrís el detalle del pago.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
        step(LIST_ROUTE, 'grid-edit', 'Editar',
             'Con el lápiz corregís la fecha o el importe del pago. La diferencia se ajusta sola en la cuenta corriente del proveedor.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(LIST_ROUTE, 'grid-delete', 'Eliminar',
             'Con el tacho eliminás el pago y su importe vuelve a la cuenta corriente del proveedor. Antes de borrar, el sistema te pide confirmación.',
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
