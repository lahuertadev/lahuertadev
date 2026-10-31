from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 10, 31)
TITLE = 'Tutorial de Cheques emitidos'
TUTORIAL_KEY = 'own-checks'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Cheques emitidos tiene su tutorial guiado: te acompaña a registrar un cheque que le das a un '
            'proveedor y te muestra cómo usarlo para pagar, cobrarlo o anularlo.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=15),
        pantalla_nombre='Cheques emitidos',
        pantalla_url='/own-check',
        tutorial=Tutorial.objects.filter(clave=TUTORIAL_KEY).first(),
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0006_novedad_vacios_tutorial'),
        ('tutorial', '0005_tutorial_cheques_emitidos'),
    ]

    operations = [
        migrations.RunPython(create_news, delete_news),
    ]
