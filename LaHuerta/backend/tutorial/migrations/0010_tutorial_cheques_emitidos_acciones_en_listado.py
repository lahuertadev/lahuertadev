from django.db import migrations

# Tutorial de Cheques emitidos (DEV-150): en desktop, Cobrar, Rechazado por el banco y Anular pasan del
# detalle a la columna Acción del listado, como íconos junto a la lupa. En mobile siguen en el detalle,
# así que el paso de mobile no cambia.

TUTORIAL_KEY = 'own-checks'
LIST_ROUTE = '/own-check'

OLD_DESCRIPTION = (
    'Con la lupa abrís el detalle del cheque: ahí ves en qué pagos se usó y lo marcás como cobrado '
    'cuando el banco lo debita, o lo anulás.'
)
NEW_TITLE = 'Ver el detalle y cambiar el estado'
OLD_TITLE = 'Ver el detalle'
NEW_DESCRIPTION = (
    'Con la lupa abrís el detalle del cheque, donde ves en qué pagos se usó. Al lado tenés Cobrar (cuando el '
    'banco lo debita), Rechazado por el banco y Anular; los que no corresponden al estado del cheque quedan grisados.'
)


def _detail_step(apps):
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    return TutorialPaso.objects.filter(
        tutorial__clave=TUTORIAL_KEY, ruta=LIST_ROUTE, elemento='grid-detail', dispositivo='desktop',
    )


def update_step(apps, schema_editor):
    _detail_step(apps).update(titulo=NEW_TITLE, descripcion=NEW_DESCRIPTION)


def restore_step(apps, schema_editor):
    _detail_step(apps).update(titulo=OLD_TITLE, descripcion=OLD_DESCRIPTION)


class Migration(migrations.Migration):
    dependencies = [('tutorial', '0009_tutorial_pagos_compras_varias_compras')]
    operations = [migrations.RunPython(update_step, restore_step)]
