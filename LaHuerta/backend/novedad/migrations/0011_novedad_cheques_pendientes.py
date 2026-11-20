from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 11, 20)
TITLE = 'Cheques pendientes de depositar a la vista'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'En Cheques ahora hay solapas: Todos, Pendientes y Rechazados. En Pendientes ves solo los cheques '
            'en cartera cuya fecha de depósito ya llegó, y en esos el botón Depositar se resalta en ámbar.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=30),
        pantalla_nombre='Cheques',
        pantalla_url='/check',
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):
    dependencies = [('novedad', '0010_novedad_pago_varias_compras')]
    operations = [migrations.RunPython(create_news, delete_news)]
