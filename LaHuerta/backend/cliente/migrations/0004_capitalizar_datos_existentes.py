from django.db import migrations
from core.text import capitalize_words

FIELDS = ('razon_social', 'nombre_fantasia', 'domicilio')
UNIQUE_FIELD = 'razon_social'


def capitalize_existing(apps, schema_editor):
    '''
    Normaliza con capitalize_words los clientes ya cargados.
    Si al normalizar la razón social dos registros quedaran iguales, ese registro
    no se modifica y se informa para revisarlo a mano.
    '''
    Model = apps.get_model('cliente', 'Cliente')
    rows = list(Model.objects.all())
    taken = {}
    if UNIQUE_FIELD:
        for row in rows:
            key = capitalize_words(getattr(row, UNIQUE_FIELD) or '').lower()
            taken.setdefault(key, []).append(row.pk)

    for row in rows:
        if UNIQUE_FIELD:
            key = capitalize_words(getattr(row, UNIQUE_FIELD) or '').lower()
            if len(taken[key]) > 1:
                print(f"  [Cliente] id={row.pk} no se normalizó: '{getattr(row, UNIQUE_FIELD)}' "
                      f"quedaría igual a otro registro ({taken[key]}).")
                continue
        changed = []
        for field in FIELDS:
            value = getattr(row, field)
            new_value = capitalize_words(value) if value else value
            max_length = Model._meta.get_field(field).max_length
            if new_value and max_length and len(new_value) > max_length:
                print(f"  [{Model.__name__}] id={row.pk} campo {field} no se normalizó: "
                      f"'{new_value}' supera los {max_length} caracteres.")
                continue
            if new_value != value:
                setattr(row, field, new_value)
                changed.append(field)
        if changed:
            row.save(update_fields=changed)


class Migration(migrations.Migration):

    dependencies = [
        ('cliente', '0003_remove_cliente_tipo_facturacion'),
    ]

    operations = [
        migrations.RunPython(capitalize_existing, migrations.RunPython.noop),
    ]
