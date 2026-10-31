from django.db import migrations

# Tutorial de Cheques emitidos: registrar un cheque propio y qué se hace después desde el listado
# (detalle, cobrar, anular, editar). Cada paso resalta el elemento que la pantalla marca con
# data-tour="<elemento>"; el evento es el que emite el formulario al guardar (emitTutorialEvent).


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


FORM_ROUTE = '/own-check/create'
LIST_ROUTE = '/own-check'

TUTORIAL = {
    'clave': 'own-checks',
    'titulo': 'Cheques emitidos',
    'descripcion': 'Cómo registrar un cheque que le das a un proveedor y qué podés hacer después: usarlo para pagar, cobrarlo o anularlo.',
    'seccion': 'Proveedores',
    'orden': 6,
    'pasos': [
        step(LIST_ROUTE, 'list-add', 'Nuevo cheque', 'Tocá "Nuevo cheque" para registrar un cheque que vas a entregarle a un proveedor.',
             'route', ruta_destino=FORM_ROUTE),
        step(FORM_ROUTE, 'own-check-number', 'Número', 'Escribí el número del cheque, el que está impreso arriba a la derecha. Después tocá Continuar.',
             'check', condicion='filled', confirmar=True),
        step(FORM_ROUTE, 'own-check-bank', 'Banco', 'Elegí el banco de la cuenta contra la que se libra el cheque.',
             'check', condicion='filled'),
        step(FORM_ROUTE, 'own-check-amount', 'Importe', 'Escribí el importe del cheque. Después tocá Continuar.',
             'check', condicion='filled', confirmar=True),
        step(FORM_ROUTE, 'own-check-issue-date', 'Fecha de emisión', 'Elegí la fecha escrita en el cheque.',
             'check', condicion='date'),
        step(FORM_ROUTE, 'own-check-deposit-date', 'Fecha de depósito',
             'Si el cheque es diferido, elegí desde cuándo el proveedor puede depositarlo: hasta esa fecha no se puede marcar como cobrado. Si es a la vista, dejala vacía. Después tocá Siguiente.',
             'next'),
        step(FORM_ROUTE, 'own-check-due-date', 'Fecha de vencimiento', 'Elegí la fecha límite para cobrarlo. No puede ser anterior a la fecha de depósito.',
             'check', condicion='date'),
        step(FORM_ROUTE, 'form-confirm', 'Registrar el cheque',
             'Revisá los datos y tocá "Registrar Cheque". Queda emitido y listo para usarlo como medio de pago en Pagos de Compras.',
             'event', evento='own-check-created'),
        step(LIST_ROUTE, 'grid-detail', 'Ver el detalle',
             'Con la lupa abrís el detalle del cheque: ahí ves en qué pagos se usó y lo marcás como cobrado cuando el banco lo debita, o lo anulás.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
        step(LIST_ROUTE, 'grid-edit', 'Editar', 'Con el lápiz editás el cheque mientras siga emitido. Si ya se usó en un pago, no se pueden cambiar el número, el banco ni el importe.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(LIST_ROUTE, 'grid-row', 'Ver, editar, cobrar o anular',
             'Tocá una fila para abrir el detalle del cheque: desde ahí lo editás, lo marcás como cobrado o lo anulás.',
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
        ('tutorial', '0004_tutorial_vacios'),
    ]

    operations = [
        migrations.RunPython(create_tutorial, delete_tutorial),
    ]
