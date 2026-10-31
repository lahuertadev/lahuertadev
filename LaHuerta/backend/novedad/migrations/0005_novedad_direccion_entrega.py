from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 10, 29)
TITLE = 'Dirección de entrega distinta a la de facturación'
TUTORIAL_KEY = 'clients'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Al dar de alta o editar un cliente, ahora podés cargar una dirección de entrega cuando la '
            'mercadería se le entrega en otro lugar. Las facturas y remitos siguen mostrando la dirección '
            'de facturación.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=30),
        pantalla_nombre='Clientes',
        pantalla_url='/client',
        tutorial=Tutorial.objects.filter(clave=TUTORIAL_KEY).first(),
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0004_novedad_tutoriales'),
        ('tutorial', '0003_tutorial_clientes_direccion_entrega'),
    ]

    operations = [
        migrations.RunPython(create_news, delete_news),
    ]
