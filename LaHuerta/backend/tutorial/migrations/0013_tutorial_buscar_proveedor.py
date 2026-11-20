from django.db import migrations

# Compras, Vacíos y Pagos de Compras (DEV-150): el proveedor se elige con un buscador (nombre o puesto),
# como el cliente en Pagos de clientes. Los pasos ya tenían condición "complete" (avanzan recién al elegir
# un proveedor de la lista), así que solo cambia el texto.

STEPS = [
    {
        'ruta': '/buy/create/simple',
        'elemento': 'buy-supplier',
        'old': 'Elegí el proveedor al que le compraste.',
        'new': 'Buscá el proveedor al que le compraste por su nombre o puesto, y elegilo de la lista.',
    },
    {
        'ruta': '/empty-movement/create/load',
        'elemento': 'empty-supplier',
        'old': 'Elegí el proveedor que te cobró los vacíos.',
        'new': 'Buscá el proveedor que te cobró los vacíos por su nombre o puesto, y elegilo de la lista.',
    },
    {
        'ruta': '/purchase-payment/create',
        'elemento': 'payment-supplier',
        'old': 'Elegí el proveedor al que le pagás. Al lado vas a ver lo que le debés hoy, incluido su saldo inicial.',
        'new': (
            'Buscá el proveedor al que le pagás por su nombre o puesto, y elegilo de la lista. '
            'Al lado vas a ver lo que le debés hoy, incluido su saldo inicial.'
        ),
    },
]


def _update(apps, text_key):
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    for step in STEPS:
        TutorialPaso.objects.filter(ruta=step['ruta'], elemento=step['elemento']).update(
            descripcion=step[text_key]
        )


def update_steps(apps, schema_editor):
    _update(apps, 'new')


def restore_steps(apps, schema_editor):
    _update(apps, 'old')


class Migration(migrations.Migration):
    dependencies = [('tutorial', '0012_tutorial_pagos_clientes_buscar_cliente')]
    operations = [migrations.RunPython(update_steps, restore_steps)]
