from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 11, 18)
TITLE = 'Un pago para varias compras de un proveedor'
CANCEL_TITLE = 'Los pagos a proveedores se anulan en lugar de eliminarse'
TUTORIAL_KEY = 'purchase-payments'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Tutorial = apps.get_model('tutorial', 'Tutorial')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion=(
            'Ahora un mismo pago a proveedor puede cubrir varias compras: las tildás y el importe se reparte solo, '
            'de la más vieja a la más nueva. Lo que sobra queda a cuenta. Y si se rechaza un cheque con el que '
            'pagaste, de un cliente o emitido, el pago pierde solo esa parte y sus compras vuelven a Parcial o Pendiente.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=45),
        pantalla_nombre='Pagos de Compras',
        pantalla_url='/purchase-payment',
        tutorial=Tutorial.objects.filter(clave=TUTORIAL_KEY).first(),
    )
    Novedad.objects.create(
        titulo=CANCEL_TITLE,
        descripcion=(
            'Un pago a proveedor ya no se borra: se anula y queda como registro. Se devuelve el importe a la '
            'cuenta corriente, sus compras vuelven a su estado anterior y los cheques vuelven a estar disponibles '
            'para otro pago.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=45),
        pantalla_nombre='Pagos de Compras',
        pantalla_url='/purchase-payment',
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo__in=[TITLE, CANCEL_TITLE], fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0009_novedad_pago_a_cuenta'),
        ('tutorial', '0009_tutorial_pagos_compras_varias_compras'),
    ]

    operations = [
        migrations.RunPython(create_news, delete_news),
    ]
