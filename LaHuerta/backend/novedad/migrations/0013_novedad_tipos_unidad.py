from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 11, 26)
TITLE = 'Tipos de unidad desde Catálogos'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Ahora podés agregar tus propios tipos de unidad, con su abreviatura y si se miden por peso '
            'o por cantidad, para usarlos en los productos.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=15),
        pantalla_nombre='Tipos de unidad',
        pantalla_url='/unit-type',
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):
    dependencies = [('novedad', '0012_novedad_anular_pagos_clientes')]
    operations = [migrations.RunPython(create_news, delete_news)]
