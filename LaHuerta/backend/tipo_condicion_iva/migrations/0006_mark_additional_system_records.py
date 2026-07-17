from django.db import migrations

# Variantes de nombres que pueden existir en producción
# distintas a las del fixture de desarrollo
ADDITIONAL_SYSTEM_DESCRIPTIONS = [
    "Monotributista",
    "Consumidor Final",
]


def mark_system_records(apps, schema_editor):
    TipoCondicionIva = apps.get_model('tipo_condicion_iva', 'TipoCondicionIva')
    TipoCondicionIva.objects.filter(descripcion__in=ADDITIONAL_SYSTEM_DESCRIPTIONS).update(is_system=True)


def reverse_mark_system_records(apps, schema_editor):
    TipoCondicionIva = apps.get_model('tipo_condicion_iva', 'TipoCondicionIva')
    TipoCondicionIva.objects.filter(descripcion__in=ADDITIONAL_SYSTEM_DESCRIPTIONS).update(is_system=False)


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_condicion_iva', '0005_mark_system_records'),
    ]

    operations = [
        migrations.RunPython(mark_system_records, reverse_mark_system_records),
    ]
