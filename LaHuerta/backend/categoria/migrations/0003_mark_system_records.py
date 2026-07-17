from django.db import migrations

SYSTEM_DESCRIPTIONS = [
    "Frutas",
    "Verduras",
    "Procesados",
]


def mark_system_records(apps, schema_editor):
    Categoria = apps.get_model('categoria', 'Categoria')
    Categoria.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=True)


def reverse_mark_system_records(apps, schema_editor):
    Categoria = apps.get_model('categoria', 'Categoria')
    Categoria.objects.filter(descripcion__in=SYSTEM_DESCRIPTIONS).update(is_system=False)


class Migration(migrations.Migration):

    dependencies = [
        ('categoria', '0002_categoria_is_system'),
    ]

    operations = [
        migrations.RunPython(mark_system_records, reverse_mark_system_records),
    ]
