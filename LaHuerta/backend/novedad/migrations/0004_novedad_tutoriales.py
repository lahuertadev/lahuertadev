from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 10, 28)
TITLE = 'Tutoriales guiados paso a paso'

# Novedad de DEV-135 que ahora ofrece el tutorial de Facturación (cargada en 0002_novedades_iniciales).
BILLING_NEWS_TITLE = 'Facturar a clientes sin lista de precios'
BILLING_NEWS_PUBLISHED_AT = date(2026, 10, 26)
BILLING_TUTORIAL_KEY = 'bills'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Las pantallas con tutorial tienen el botón del birrete abajo a la derecha: te guía paso a '
            'paso mientras hacés la tarea real y lo que cargás queda guardado. Por ahora: Clientes, '
            'Facturación, Pagos de Clientes y Compras. En el menú, Tutoriales los reúne a todos.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=45),
        pantalla_nombre='Tutoriales',
        pantalla_url='/tutorials',
    )
    Novedad.objects.filter(
        titulo=BILLING_NEWS_TITLE, fecha_publicacion=BILLING_NEWS_PUBLISHED_AT,
    ).update(tutorial=Tutorial.objects.filter(clave=BILLING_TUTORIAL_KEY).first())


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()
    Novedad.objects.filter(
        titulo=BILLING_NEWS_TITLE, fecha_publicacion=BILLING_NEWS_PUBLISHED_AT,
    ).update(tutorial=None)


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0003_novedad_tutorial'),
    ]

    operations = [
        migrations.RunPython(create_news, delete_news),
    ]
