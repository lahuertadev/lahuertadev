from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 10, 26)

# Cambios funcionales de las últimas versiones. Se crean del más viejo al más nuevo:
# a igual fecha de publicación el Inicio muestra primero la de id más alto (DEV-135).
INITIAL_NEWS = [
    {
        'titulo': 'Carga masiva de compras',
        'descripcion': 'Podés cargar en un solo paso las compras a varios proveedores para una misma fecha.',
        'pantalla_nombre': 'Compras',
        'pantalla_url': '/buy/',
    },
    {
        'titulo': 'Listas de precios por producto',
        'descripcion': (
            'Cada producto ocupa una fila en la lista de precios, con el precio por unidad calculado '
            'y la opción de asignar la lista a varios clientes a la vez.'
        ),
        'pantalla_nombre': 'Listas de Precios',
        'pantalla_url': '/price-list/',
    },
    {
        'titulo': 'Vacíos: carga y devolución por proveedor',
        'descripcion': (
            'Los vacíos ahora se registran aparte de la compra: una carga o una devolución por proveedor, '
            'con el detalle de cada contenedor.'
        ),
        'pantalla_nombre': 'Vacíos',
        'pantalla_url': '/empty-movement/',
    },
    {
        'titulo': 'Facturar a clientes sin lista de precios',
        'descripcion': (
            'Ahora un cliente puede no tener lista de precios asignada. Al facturarle, '
            'el precio de cada producto se carga a mano en la factura.'
        ),
        'pantalla_nombre': 'Facturación',
        'pantalla_url': '/bill/',
    },
]


def create_initial_news(apps, schema_editor):
    '''
    El modelo histórico no ejecuta Novedad.save(), por eso vigente_hasta se calcula acá.
    '''
    Novedad = apps.get_model('novedad', 'Novedad')
    for news in INITIAL_NEWS:
        Novedad.objects.create(
            fecha_publicacion=PUBLISHED_AT,
            vigente_hasta=PUBLISHED_AT + timedelta(days=30),
            **news,
        )


def delete_initial_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    titles = [news['titulo'] for news in INITIAL_NEWS]
    Novedad.objects.filter(titulo__in=titles, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('novedad', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_initial_news, delete_initial_news),
    ]
