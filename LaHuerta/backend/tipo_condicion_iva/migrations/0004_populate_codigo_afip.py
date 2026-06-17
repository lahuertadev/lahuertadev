from django.db import migrations

AFIP_CODE_BY_DESCRIPTION = {
    "Resp. Inscripto": 1,
    "Monotributo": 6,
    "Monotributista": 6,
    "Exento": 4,
    "Cons. Final": 5,
    "Consumidor Final": 5,
    "Resp. No Insc.": 2,
    "No Categorizado": 7,
}


def populate_codigo_afip(apps, schema_editor):
    TipoCondicionIva = apps.get_model('tipo_condicion_iva', 'TipoCondicionIva')
    for obj in TipoCondicionIva.objects.all():
        codigo = AFIP_CODE_BY_DESCRIPTION.get(obj.descripcion)
        if codigo is not None:
            obj.codigo_afip = codigo
            obj.save(update_fields=['codigo_afip'])


def reverse_populate(apps, schema_editor):
    TipoCondicionIva = apps.get_model('tipo_condicion_iva', 'TipoCondicionIva')
    TipoCondicionIva.objects.all().update(codigo_afip=None)


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_condicion_iva', '0003_tipocondicioniva_codigo_afip'),
    ]

    operations = [
        migrations.RunPython(populate_codigo_afip, reverse_populate),
    ]
