import re
from django.db import migrations

# Abreviaturas de las direcciones al momento de esta migración (copia de
# core.text.ADDRESS_ABBREVIATIONS: las migraciones no importan constantes, ver backend-architecture.md).
ADDRESS_ABBREVIATIONS = {
    'av': 'Av.', 'avda': 'Avda.', 'bv': 'Bv.', 'bvar': 'Bvar.', 'pje': 'Pje.', 'diag': 'Diag.',
    'gral': 'Gral.', 'cnel': 'Cnel.', 'tte': 'Tte.', 'pte': 'Pte.', 'dr': 'Dr.', 'ing': 'Ing.',
    'gdor': 'Gdor.', 'sta': 'Sta.', 'sto': 'Sto.', 'nro': 'Nro.', 'esq': 'Esq.', 'dto': 'Dto.',
    'dpto': 'Dpto.', 'mz': 'Mz.', 'mza': 'Mza.', 'km': 'Km', 'pb': 'PB', 'uf': 'UF', 'ph': 'PH',
    's/n': 'S/N', 'caba': 'CABA',
}
TRAILING_PUNCTUATION = re.compile(r'^(.*?)([,;]*)$')

APP_LABEL = 'cliente'
MODEL_NAME = 'Cliente'
FIELDS = ('domicilio', 'domicilio_entrega')


def normalize_abbreviations(value):
    '''
    Solo reemplaza las abreviaturas: el resto del texto ya está normalizado
    (0004_capitalizar_datos_existentes).
    '''
    words = []
    for word in value.split():
        body, punctuation = TRAILING_PUNCTUATION.match(word).groups()
        abbreviation = ADDRESS_ABBREVIATIONS.get(body.lower().replace('.', ''))
        words.append(abbreviation + punctuation if abbreviation else word)
    return ' '.join(words)


def normalize_existing(apps, schema_editor):
    Model = apps.get_model(APP_LABEL, MODEL_NAME)
    for row in Model.objects.all():
        changed = []
        for field in FIELDS:
            value = getattr(row, field)
            if not value:
                continue
            new_value = normalize_abbreviations(value)
            max_length = Model._meta.get_field(field).max_length
            if max_length and len(new_value) > max_length:
                print(f"  [{MODEL_NAME}] id={row.pk} campo {field} no se normalizó: "
                      f"'{new_value}' supera los {max_length} caracteres.")
                continue
            if new_value != value:
                setattr(row, field, new_value)
                changed.append(field)
        if changed:
            row.save(update_fields=changed)


class Migration(migrations.Migration):

    dependencies = [
        ('cliente', '0005_cliente_direccion_entrega'),
    ]

    operations = [
        migrations.RunPython(normalize_existing, migrations.RunPython.noop),
    ]
