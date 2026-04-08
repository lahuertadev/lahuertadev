from django.db import models
from lista_precios.models import ListaPrecios
from producto.models import Producto
from tipo_venta.models import TipoVenta

class ListaPreciosProducto(models.Model):
    id = models.SmallAutoField(primary_key=True)
    lista_precios = models.ForeignKey(ListaPrecios, on_delete=models.CASCADE, blank=True, null=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, blank=True, null=True)
    tipo_venta = models.ForeignKey(TipoVenta, on_delete=models.PROTECT)
    precio = models.DecimalField(max_digits=10, decimal_places=0)

    class Meta:
        db_table = 'lista_precios_producto'
        constraints = [
            models.UniqueConstraint(
                fields=['lista_precios', 'producto', 'tipo_venta'],
                name='unique_lista_producto_tipo_venta'
            )
        ]