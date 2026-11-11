from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 11, 11)
TITLE = 'Varios contactos por cliente y proveedor'
TUTORIAL_KEY = 'clients'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Ahora podés cargar varios teléfonos para cada cliente y proveedor, con una descripción '
            '(por ejemplo, Pagos o Compras) y un email opcionales. El teléfono que ya tenían quedó '
            'como su primer contacto.'
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
        ('novedad', '0007_novedad_tutorial_cheques_emitidos'),
        ('tutorial', '0006_tutorial_clientes_contactos'),
    ]

    operations = [
        migrations.RunPython(create_news, delete_news),
    ]
