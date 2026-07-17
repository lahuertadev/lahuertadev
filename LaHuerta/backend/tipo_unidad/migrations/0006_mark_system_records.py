from django.db import migrations

SYSTEM_DESCRIPTIONS = [
    "Unidad",
    "Kilogramo",
    "Planta",
    "Diente",
]


def mark_system_records(apps, schema_editor):
    TipoUnidad = apps.get_model('tipo_unidad', 'TipoUnidad')
    TipoUnidad.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=True)


def reverse_mark_system_records(apps, schema_editor):
    TipoUnidad = apps.get_model('tipo_unidad', 'TipoUnidad')
    TipoUnidad.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=False)


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_unidad', '0005_tipounidad_is_system'),
    ]

    operations = [
        migrations.RunPython(mark_system_records, reverse_mark_system_records),
    ]
