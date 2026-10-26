from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 10, 26)


def create_first_news(apps, schema_editor):
    '''
    Primera novedad: DEV-135. El modelo histórico no ejecuta Novedad.save(),
    por eso vigente_hasta se calcula acá.
    '''
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.create(
        titulo='Facturar a clientes sin lista de precios',
        descripcion=(
            'Ahora un cliente puede no tener lista de precios asignada. Al facturarle, '
            'el precio de cada producto se carga a mano en la factura.'
        ),
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=30),
        pantalla_nombre='Facturación',
        pantalla_url='/bill/',
    )


def delete_first_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo='Facturar a clientes sin lista de precios', fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_first_news, delete_first_news),
    ]
