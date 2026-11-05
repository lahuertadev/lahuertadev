from django.db import migrations

# DEV-119: el cliente pasa a tener varios contactos (teléfono, descripción y email). El paso del
# teléfono sigue resaltando el primer teléfono ('client-phone') con un texto nuevo, y a continuación
# se suma un paso que muestra el botón "Agregar contacto".

TUTORIAL_KEY = 'clients'
ROUTE = '/client/create'
PHONE_ELEMENT = 'client-phone'
PHONE_DESCRIPTION = 'Escribí el teléfono de contacto: es obligatorio para registrar el cliente. La descripción y el email son opcionales. Después tocá Continuar.'
OLD_PHONE_DESCRIPTION = 'Escribí el teléfono de contacto: es obligatorio para registrar el cliente. Después tocá Continuar.'
NEW_STEP = {
    'elemento': 'client-contact-add', 'titulo': 'Más contactos',
    'descripcion': 'Si el cliente tiene otros teléfonos (por ejemplo, uno para pagos y otro para compras), sumalos con "Agregar contacto" y escribí en la descripción para qué es cada uno. Después tocá Siguiente.',
    'avance': 'next',
}


def shift_steps(TutorialPaso, tutorial, after, offset):
    # Uno por uno y en el orden que no repite (tutorial, orden) en ningún momento.
    steps = TutorialPaso.objects.filter(tutorial=tutorial, orden__gt=after)
    for step in steps.order_by('-orden' if offset > 0 else 'orden'):
        step.orden += offset
        step.save(update_fields=['orden'])


def add_contacts_step(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    tutorial = Tutorial.objects.filter(clave=TUTORIAL_KEY).first()
    phone_step = TutorialPaso.objects.filter(tutorial=tutorial, elemento=PHONE_ELEMENT).first() if tutorial else None
    if not phone_step:
        return
    phone_step.descripcion = PHONE_DESCRIPTION
    phone_step.save(update_fields=['descripcion'])
    shift_steps(TutorialPaso, tutorial, phone_step.orden, 1)
    TutorialPaso.objects.create(tutorial=tutorial, orden=phone_step.orden + 1, ruta=ROUTE, **NEW_STEP)


def remove_contacts_step(apps, schema_editor):
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    TutorialPaso = apps.get_model('tutorial', 'TutorialPaso')
    tutorial = Tutorial.objects.filter(clave=TUTORIAL_KEY).first()
    new_step = TutorialPaso.objects.filter(tutorial=tutorial, elemento=NEW_STEP['elemento']).first() if tutorial else None
    if not new_step:
        return
    removed_order = new_step.orden
    new_step.delete()
    shift_steps(TutorialPaso, tutorial, removed_order, -1)
    TutorialPaso.objects.filter(tutorial=tutorial, elemento=PHONE_ELEMENT).update(descripcion=OLD_PHONE_DESCRIPTION)


class Migration(migrations.Migration):

    dependencies = [
        ('tutorial', '0005_tutorial_cheques_emitidos'),
    ]

    operations = [
        migrations.RunPython(add_contacts_step, remove_contacts_step),
    ]
