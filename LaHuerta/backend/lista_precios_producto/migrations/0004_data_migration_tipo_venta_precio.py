from django.db import migrations


def migrate_precio_por_tipo_venta(apps, schema_editor):
    ListaPreciosProducto = apps.get_model('lista_precios_producto', 'ListaPreciosProducto')
    TipoVenta = apps.get_model('tipo_venta', 'TipoVenta')

    try:
        tipo_unidad = TipoVenta.objects.get(descripcion__iexact='unidad')
        tipo_bulto = TipoVenta.objects.get(descripcion__iexact='bulto')
    except TipoVenta.DoesNotExist:
        return

    filas_originales = list(ListaPreciosProducto.objects.all())

    for fila in filas_originales:
        precio_unitario = fila.precio_unitario
        precio_bulto = fila.precio_bulto

        # Reutiliza la fila original para tipo Unidad
        fila.tipo_venta = tipo_unidad
        fila.precio = precio_unitario
        fila.save()

        # Crea una nueva fila para tipo Bulto
        ListaPreciosProducto.objects.create(
            lista_precios=fila.lista_precios,
            producto=fila.producto,
            tipo_venta=tipo_bulto,
            precio=precio_bulto,
            precio_unitario=precio_bulto,
            precio_bulto=precio_bulto,
        )


def reverse_migration(apps, schema_editor):
    ListaPreciosProducto = apps.get_model('lista_precios_producto', 'ListaPreciosProducto')
    TipoVenta = apps.get_model('tipo_venta', 'TipoVenta')

    try:
        tipo_bulto = TipoVenta.objects.get(descripcion__iexact='bulto')
    except TipoVenta.DoesNotExist:
        return

    ListaPreciosProducto.objects.filter(tipo_venta=tipo_bulto).delete()
    ListaPreciosProducto.objects.all().update(tipo_venta=None, precio=None)


class Migration(migrations.Migration):

    dependencies = [
        ('lista_precios_producto', '0003_listapreciosproducto_precio_and_more'),
        ('tipo_venta', '0001_initial'),
    ]

    operations = [
        # Eliminar el constraint viejo ANTES de crear filas duplicadas
        migrations.RemoveConstraint(
            model_name='listapreciosproducto',
            name='unique_lista_producto',
        ),
        migrations.RunPython(migrate_precio_por_tipo_venta, reverse_migration),
    ]
