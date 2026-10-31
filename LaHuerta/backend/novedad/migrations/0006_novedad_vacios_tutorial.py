from datetime import date
from django.db import migrations

# Novedad de vacíos (cargada en 0002_novedades_iniciales): ahora ofrece el tutorial de Vacíos.
EMPTY_NEWS_TITLE = 'Vacíos: carga y devolución por proveedor'
EMPTY_NEWS_PUBLISHED_AT = date(2026, 10, 26)
EMPTY_TUTORIAL_KEY = 'empty-movements'


def link_tutorial(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.filter(
        titulo=EMPTY_NEWS_TITLE, fecha_publicacion=EMPTY_NEWS_PUBLISHED_AT,
    ).update(tutorial=Tutorial.objects.filter(clave=EMPTY_TUTORIAL_KEY).first())


def unlink_tutorial(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(
        titulo=EMPTY_NEWS_TITLE, fecha_publicacion=EMPTY_NEWS_PUBLISHED_AT,
    ).update(tutorial=None)


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0005_novedad_direccion_entrega'),
        ('tutorial', '0004_tutorial_vacios'),
    ]

    operations = [
        migrations.RunPython(link_tutorial, unlink_tutorial),
    ]
