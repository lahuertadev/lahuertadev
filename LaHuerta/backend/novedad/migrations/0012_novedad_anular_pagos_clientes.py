from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 11, 25)
TITLE = 'Los pagos de clientes se anulan y pueden tener varios cheques'
TUTORIAL_KEY = 'client-payments'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Un pago de cliente ya no se elimina: se anula con un motivo y queda como registro. Además, un pago '
            'con cheque puede tener varios cheques, y si el banco rechaza todos, el pago se anula solo.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=45),
        pantalla_nombre='Pagos de Clientes',
        pantalla_url='/client-payment',
        tutorial=Tutorial.objects.filter(clave=TUTORIAL_KEY).first(),
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('novedad', '0011_novedad_cheques_pendientes'),
        ('tutorial', '0014_tutorial_pagos_clientes_anular_varios_cheques'),
    ]
    operations = [migrations.RunPython(create_news, delete_news)]
