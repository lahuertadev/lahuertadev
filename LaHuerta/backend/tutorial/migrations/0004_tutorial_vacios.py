from django.db import migrations

# Tutorial de Vacíos: elegir entre carga y devolución, cargar el movimiento y las acciones del listado.
# Cada paso resalta el elemento que la pantalla marca con data-tour="<elemento>"; el evento es el que
# emite el formulario al guardar (emitTutorialEvent).


def step(ruta, elemento, titulo, descripcion, avance, **extra):
    return {'ruta': ruta, 'elemento': elemento, 'titulo': titulo, 'descripcion': descripcion, 'avance': avance, **extra}


def list_action_steps(ruta, entidad):
    '''Recorrido por las acciones de la fila del listado, al terminar un alta (igual que en 0002).'''
    return [
        step(ruta, 'grid-detail', 'Ver el detalle', f'Con la lupa de cada fila abrís el detalle completo de {entidad}.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True),
        step(ruta, 'grid-edit', 'Editar', f'Con el lápiz modificás los datos de {entidad}.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(ruta, 'grid-delete', 'Eliminar', f'Con el tacho eliminás {entidad}. Antes de borrar, el sistema te pide confirmación.',
             'next', dispositivo='desktop', listo_cuando='grid-row', solo_lectura=True, opcional=True),
        step(ruta, 'grid-row', 'Ver, editar o eliminar', f'Tocá una fila para abrir el detalle de {entidad}: desde ahí podés editarlo o eliminarlo.',
             'next', dispositivo='mobile', solo_lectura=True),
    ]


TUTORIAL = {
    'clave': 'empty-movements',
    'titulo': 'Vacíos',
    'descripcion': 'Cómo registrar una carga o una devolución de vacíos de un proveedor y qué podés hacer desde el listado.',
    'seccion': 'Proveedores',
    'orden': 5,
    'pasos': [
        step('/empty-movement', 'list-add', 'Nuevo movimiento', 'Tocá "Nuevo movimiento" para registrar vacíos de un proveedor.',
             'route', ruta_destino='/empty-movement/create'),
        step('/empty-movement/create', 'empty-type-return', 'Devolución de vacíos',
             'Los vacíos que le devolvés al proveedor, tal como figuran en el vale que te da el puesto. Restan de su cuenta corriente.',
             'next', solo_lectura=True),
        step('/empty-movement/create', 'empty-type-load', 'Carga de vacíos',
             'Los vacíos que te cobró el proveedor, en la factura de la compra o aparte. Suman a su cuenta corriente. Tocá "Carga de vacíos" para seguir.',
             'route', ruta_destino='/empty-movement/create/load'),
        step('/empty-movement/create/load', 'empty-supplier', 'Proveedor', 'Elegí el proveedor que te cobró los vacíos.',
             'check', condicion='complete'),
        step('/empty-movement/create/load', 'empty-date', 'Fecha', 'Por defecto es la de hoy. Cambiala si los vacíos son de otro día.',
             'next'),
        step('/empty-movement/create/load', 'empty-type', 'Tipo',
             'Viene elegido según lo que tocaste antes (carga o devolución). Si te equivocaste, lo cambiás acá.',
             'next'),
        step('/empty-movement/create/load', 'empty-receipt', 'N° de comprobante',
             'Opcional: el número del vale o de la factura del proveedor. Sirve para encontrarlo después. Escribilo si lo tenés y tocá Siguiente.',
             'next'),
        step('/empty-movement/create/load', 'empty-lines', 'Vacíos',
             'Elegí el tipo de vacío (cajón, jaula, bandeja…), la cantidad y el precio unitario. Con "Agregar vacío" sumás otro tipo; el total se calcula solo. Después tocá Continuar.',
             'check', condicion='complete', confirmar=True),
        step('/empty-movement/create/load', 'form-confirm', 'Guardar el movimiento',
             'Revisá el total y tocá "Confirmar". El importe se suma a la cuenta corriente del proveedor.',
             'event', evento='empty-movement-created'),
        *list_action_steps('/empty-movement', 'cada movimiento'),
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
        ('tutorial', '0003_tutorial_clientes_direccion_entrega'),
    ]

    operations = [
        migrations.RunPython(create_tutorial, delete_tutorial),
    ]
