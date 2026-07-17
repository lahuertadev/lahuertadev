from django.db import migrations

SYSTEM_DESCRIPTIONS = [
    "Resp. Inscripto",
    "Monotributo",
    "Exento",
    "Cons. Final",
    "Resp. No Insc.",
    "No Categorizado",
]


def mark_system_records(apps, schema_editor):
    TipoCondicionIva = apps.get_model('tipo_condicion_iva', 'TipoCondicionIva')
    TipoCondicionIva.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=True)


def reverse_mark_system_records(apps, schema_editor):
    TipoCondicionIva = apps.get_model('tipo_condicion_iva', 'TipoCondicionIva')
    TipoCondicionIva.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=False)


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_condicion_iva', '0004_populate_codigo_afip'),
    ]

    operations = [
        migrations.RunPython(mark_system_records, reverse_mark_system_records),
    ]
