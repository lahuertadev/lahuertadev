from django.db import migrations

SYSTEM_DESCRIPTIONS = [
    "Cajón",
    "Bolsa",
    "Jaula",
    "Bandeja",
    "Unidad",
    "Riestra",
    "Caja",
]


def mark_system_records(apps, schema_editor):
    TipoContenedor = apps.get_model('tipo_contenedor', 'TipoContenedor')
    TipoContenedor.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=True)


def reverse_mark_system_records(apps, schema_editor):
    TipoContenedor = apps.get_model('tipo_contenedor', 'TipoContenedor')
    TipoContenedor.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=False)


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_contenedor', '0004_tipocontenedor_is_system'),
    ]

    operations = [
        migrations.RunPython(mark_system_records, reverse_mark_system_records),
    ]
