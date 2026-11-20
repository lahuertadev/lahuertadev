from django.db import migrations

# Tutorial de Pagos de clientes (DEV-150): el cliente se elige con un buscador (razón social, nombre de
# fantasía o CUIT), como en Facturación. Con condición "filled" el paso avanzaba al escribir la primera
# letra; pasa a "complete", que el formulario marca recién cuando hay un cliente elegido.

FORM_ROUTE = '/client-payment/create'
ELEMENT = 'payment-client'

OLD = {'descripcion': 'Elegí el cliente que pagó.', 'condicion': 'filled'}
NEW = {
    'descripcion': 'Buscá el cliente que pagó por su razón social, nombre de fantasía o CUIT, y elegilo de la lista.',
    'condicion': 'complete',
}


def _client_step(apps):
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    return TutorialPaso.objects.filter(ruta=FORM_ROUTE, elemento=ELEMENT)


def update_step(apps, schema_editor):
    _client_step(apps).update(**NEW)


def restore_step(apps, schema_editor):
    _client_step(apps).update(**OLD)


class Migration(migrations.Migration):
    dependencies = [('tutorial', '0011_tutorial_cheques_emitidos_vencimiento_automatico')]
    operations = [migrations.RunPython(update_step, restore_step)]
