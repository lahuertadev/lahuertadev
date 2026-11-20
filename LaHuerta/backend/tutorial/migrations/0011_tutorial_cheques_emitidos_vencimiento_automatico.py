from django.db import migrations

# Tutorial de Cheques emitidos (DEV-150): al cargar la fecha de depósito, el formulario completa solo el
# vencimiento con 30 días corridos (Ley de Cheques 24.452, art. 25). El paso del vencimiento lo explica.

TUTORIAL_KEY = 'own-checks'
FORM_ROUTE = '/own-check/create'

OLD_DESCRIPTION = 'Elegí la fecha límite para cobrarlo. No puede ser anterior a la fecha de depósito.'
NEW_DESCRIPTION = (
    'Si cargaste la fecha de depósito, se completa sola con 30 días corridos, el plazo de la ley de cheques; '
    'podés cambiarla. Si el cheque es a la vista, elegila vos. No puede ser anterior a la fecha de depósito.'
)


def _due_date_step(apps):
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    return TutorialPaso.objects.filter(tutorial__clave=TUTORIAL_KEY, ruta=FORM_ROUTE, elemento='own-check-due-date')


def update_step(apps, schema_editor):
    _due_date_step(apps).update(descripcion=NEW_DESCRIPTION)


def restore_step(apps, schema_editor):
    _due_date_step(apps).update(descripcion=OLD_DESCRIPTION)


class Migration(migrations.Migration):
    dependencies = [('tutorial', '0010_tutorial_cheques_emitidos_acciones_en_listado')]
    operations = [migrations.RunPython(update_step, restore_step)]
