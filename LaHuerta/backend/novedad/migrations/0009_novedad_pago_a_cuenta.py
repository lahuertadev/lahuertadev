from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 11, 8)
TITLE = 'Pagos a cuenta a proveedores'
TUTORIAL_KEY = 'purchase-payments'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Ahora podés pagarle a un proveedor sin elegir una compra (por ejemplo, su saldo inicial o un adelanto) '
            'y registrar en un mismo pago varios cheques, de clientes o emitidos. También podés corregir la fecha de un pago, '
            'y en el detalle de cada cheque emitido ves todos los pagos que hiciste con él.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=45),
        pantalla_nombre='Pagos de Compras',
        pantalla_url='/purchase-payment',
        tutorial=Tutorial.objects.filter(clave=TUTORIAL_KEY).first(),
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0008_novedad_contactos'),
        ('tutorial', '0007_tutorial_pagos_compras'),
    ]

    operations = [
        migrations.RunPython(create_news, delete_news),
    ]
