from django.db import migrations

# DEV-119: el teléfono de clientes y proveedores pasa a ser su primer contacto, sin descripción ni
# email. El campo `telefono` se borra en migraciones aparte de cada app, que dependen de esta, para
# poder revisar los datos migrados antes de borrar el campo viejo.

OWNER_MODELS = (
    ('cliente', 'cliente', 'Cliente'),
    ('proveedor', 'proveedor', 'Proveedor'),
)


def copy_phones_to_contacts(apps, schema_editor):
    Contacto = apps.get_model('contacto', 'Contacto')
    for owner_field, app_label, model_name in OWNER_MODELS:
        Owner = apps.get_model(app_label, model_name)
        Contacto.objects.bulk_create([
            Contacto(**{owner_field: owner}, numero=owner.telefono.strip(), descripcion=None, email=None)
            for owner in Owner.objects.all()
            if (owner.telefono or '').strip()
        ])


def copy_contacts_to_phones(apps, schema_editor):
    '''
    Reversa: el primer contacto de cada dueño vuelve al campo `telefono` y se borran los contactos.
    '''
    Contacto = apps.get_model('contacto', 'Contacto')
    for owner_field, app_label, model_name in OWNER_MODELS:
        Owner = apps.get_model(app_label, model_name)
        for owner in Owner.objects.all():
            first_contact = Contacto.objects.filter(**{owner_field: owner}).order_by('id').first()
            if first_contact:
                owner.telefono = first_contact.numero
                owner.save(update_fields=['telefono'])
    Contacto.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('contacto', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(copy_phones_to_contacts, copy_contacts_to_phones),
    ]
