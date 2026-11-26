import importlib

from django.db import migrations

# Tutorial de Pagos de clientes (DEV-155): un pago con Cheque puede tener varios cheques y su importe
# es la suma, así que el importe se escribe solo si el pago no es con cheques (como en Pagos de Compras:
# primero el tipo de pago, después los cheques o el importe). Un pago no se elimina: se anula, con motivo.
# Cada paso resalta el elemento que la pantalla marca con data-tour="<elemento>".

TUTORIAL_KEY = 'client-payments'
LIST_ROUTE = '/client-payment'
FORM_ROUTE = '/client-payment/create'

DESCRIPTION = 'Cómo registrar el pago de un cliente, en efectivo, transferencia o con cheques, y qué podés hacer desde el listado.'


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


STEPS = [
    step(LIST_ROUTE, 'list-add', 'Nuevo pago', 'Tocá "Nuevo pago" para registrar lo que pagó un cliente.',
         'route', ruta_destino=FORM_ROUTE),
    step(FORM_ROUTE, 'payment-client', 'Cliente',
         'Buscá el cliente que pagó por su razón social, nombre de fantasía o CUIT, y elegilo de la lista.',
         'check', condicion='complete'),
    step(FORM_ROUTE, 'payment-date', 'Fecha de pago', 'Elegí la fecha en que pagó.',
         'check', condicion='date'),
    step(FORM_ROUTE, 'payment-type', 'Tipo de pago',
         'Elegí cómo pagó (efectivo, transferencia, cheque…). Un pago tiene un solo tipo: si pagó de varias formas, cargá un pago por cada una.',
         'check', condicion='filled'),
    step(FORM_ROUTE, 'payment-check', 'Cheques',
         'Como pagó con cheques, cargá cada uno: número, banco, importe y fecha de emisión; si es diferido, activalo y poné la fecha de depósito. Con "Agregar cheque" sumás otro. El importe del pago es la suma. Después tocá Continuar.',
         'check', condicion='complete', confirmar=True, opcional=True),
    step(FORM_ROUTE, 'payment-amount', 'Importe', 'Escribí el importe que pagó. Después tocá Continuar.',
         'check', condicion='filled', confirmar=True, opcional=True),
    step(FORM_ROUTE, 'form-confirm', 'Registrar el pago',
         'Tocá "Registrar Pago" para guardarlo. El importe se descuenta de la cuenta corriente del cliente.',
         'event', evento='client-payment-created'),
    step(LIST_ROUTE, 'grid-detail', 'Ver el detalle', 'Con la lupa de la columna Acción abrís el detalle del pago, con sus cheques.',
         'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
    step(LIST_ROUTE, 'grid-edit', 'Editar',
         'Con el lápiz corregís el pago. Si es con cheques, podés corregir sus datos, cambiar el importe de los que están en cartera, agregar cheques y quitar los que están en cartera; para cambiar el cliente o el tipo de pago, anulalo y cargalo de nuevo.',
         'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
    step(LIST_ROUTE, 'grid-delete', 'Anular',
         'Con Anular dejás el pago sin efecto: no se borra, queda como registro con estado Anulado y el motivo que escribas. El importe vuelve a la cuenta corriente del cliente y sus cheques quedan anulados.',
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


def use_cancel_and_several_checks(apps, schema_editor):
    _replace_steps(apps, DESCRIPTION, STEPS)


def restore_previous_steps(apps, schema_editor):
    '''Vuelta atrás: los pasos de la migración que creó el tutorial, con el buscador de cliente de 0012.'''
    # Los nombres de los módulos empiezan con un número: no se pueden importar con `import`.
    initial = importlib.import_module('tutorial.migrations.0002_tutoriales_iniciales').TUTORIALS
    previous = next(tutorial for tutorial in initial if tutorial['clave'] == TUTORIAL_KEY)
    client_step = importlib.import_module('tutorial.migrations.0012_tutorial_pagos_clientes_buscar_cliente')
    steps = [
        {**data, **client_step.NEW} if data['elemento'] == client_step.ELEMENT else data
        for data in previous['pasos']
    ]
    _replace_steps(apps, previous['descripcion'], steps)


class Migration(migrations.Migration):

    dependencies = [
        ('tutorial', '0013_tutorial_buscar_proveedor'),
    ]

    operations = [
        migrations.RunPython(use_cancel_and_several_checks, restore_previous_steps),
    ]
