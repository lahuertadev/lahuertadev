import importlib

from django.db import migrations

# Tutorial de Pagos de Compras (DEV-150): ya no hay que elegir entre "Pago de compras" y "Pago a cuenta".
# Hay un solo formulario: se elige el proveedor, se cargan los datos del pago y se tildan las compras que
# cubre (el importe se reparte solo, de la más vieja a la más nueva); lo que no se aplica queda a cuenta.
# Cada paso resalta el elemento que la pantalla marca con data-tour="<elemento>".

TUTORIAL_KEY = 'purchase-payments'
LIST_ROUTE = '/purchase-payment'
FORM_ROUTE = '/purchase-payment/create'

DESCRIPTION = (
    'Cómo registrar un pago a un proveedor, de una o varias compras o a cuenta de su saldo, '
    'y qué podés hacer desde el listado.'
)


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


STEPS = [
    step(LIST_ROUTE, 'list-add', 'Nuevo pago', 'Tocá "Nuevo pago" para registrar un pago a un proveedor.',
         'route', ruta_destino=FORM_ROUTE),
    step(FORM_ROUTE, 'payment-supplier', 'Proveedor',
         'Elegí el proveedor al que le pagás. Al lado vas a ver lo que le debés hoy, incluido su saldo inicial.',
         'check', condicion='complete'),
    step(FORM_ROUTE, 'payment-date', 'Fecha de pago', 'Por defecto es la de hoy. Cambiala si el pago es de otro día.',
         'next'),
    step(FORM_ROUTE, 'payment-type', 'Tipo de pago',
         'Elegí cómo pagás: efectivo, cheques de clientes o cheques emitidos. Un pago tiene un solo tipo: si pagás con varios, cargá un pago por cada uno.',
         'check', condicion='filled'),
    step(FORM_ROUTE, 'payment-check', 'Cheques',
         'Elegí los cheques con los que pagás; con "Agregar cheque" sumás otro. Cada cheque, de cliente o emitido, se usa entero, y el importe del pago es la suma.',
         'check', condicion='complete', opcional=True),
    step(FORM_ROUTE, 'payment-amount', 'Importe', 'Escribí cuánto pagás. Después tocá Continuar.',
         'check', condicion='filled', confirmar=True, opcional=True),
    step(FORM_ROUTE, 'payment-buys', 'Compras pendientes de pago',
         'Tildá las compras que pagás: el importe se reparte solo, de la más vieja a la más nueva, y podés corregir cuánto va a cada una. Lo que no se aplica a ninguna compra queda a cuenta; si no tildás ninguna, el pago es todo a cuenta (por ejemplo, un saldo inicial o un adelanto). Después tocá Continuar.',
         'next', opcional=True),
    step(FORM_ROUTE, 'form-confirm', 'Registrar el pago',
         'Revisá los datos y tocá "Registrar pago". El importe se descuenta de la cuenta corriente del proveedor y cada compra pasa a Parcial o Abonada.',
         'event', evento='purchase-payment-created', ruta_destino=LIST_ROUTE),
    step(LIST_ROUTE, 'grid-detail', 'Ver el detalle', 'Con la lupa de la columna Acción abrís el detalle del pago, con las compras que cubre.',
         'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
    step(LIST_ROUTE, 'grid-edit', 'Editar',
         'Con el lápiz corregís la fecha del pago, las compras que cubre y, si no se pagó con cheques, el importe. La diferencia se ajusta sola en la cuenta corriente del proveedor.',
         'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
    step(LIST_ROUTE, 'grid-delete', 'Anular',
         'Con Anular dejás el pago sin efecto: no se borra, queda como registro con estado Anulado. El importe vuelve a la cuenta corriente del proveedor, sus compras vuelven a su estado anterior y los cheques quedan libres para otro pago. Antes, el sistema te pide confirmación.',
         'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
    step(LIST_ROUTE, 'grid-row', 'Ver, editar o anular', 'Tocá una fila para abrir el detalle del pago: desde ahí podés editarlo o anularlo.',
         'next', dispositivo='mobile', solo_lectura=True),
]


def _replace_steps(apps, description, steps):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    tutorial = Tutorial.objects.filter(clave=TUTORIAL_KEY).first()
    if not tutorial:
        return
    tutorial.descripcion = description
    tutorial.save(update_fields=['descripcion'])
    tutorial.pasos.all().delete()
    TutorialPaso.objects.bulk_create([
        TutorialPaso(tutorial=tutorial, orden=step_order, **step_data)
        for step_order, step_data in enumerate(steps, start=1)
    ])


def use_single_form(apps, schema_editor):
    _replace_steps(apps, DESCRIPTION, STEPS)


def restore_two_paths(apps, schema_editor):
    '''Vuelta atrás: los pasos de la migración que creó el tutorial, con sus dos caminos.'''
    # El nombre del módulo empieza con un número: no se puede importar con `import`.
    previous = importlib.import_module('tutorial.migrations.0007_tutorial_pagos_compras').TUTORIAL
    _replace_steps(apps, previous['descripcion'], previous['pasos'])


class Migration(migrations.Migration):

    dependencies = [
        ('tutorial', '0008_paso_ruta_destino_camino_alternativo'),
    ]

    operations = [
        migrations.RunPython(use_single_form, restore_two_paths),
    ]
