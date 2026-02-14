from django.db import models
from lista_precios.models import ListaPrecios
from producto.models import Producto

class ListaPreciosProducto(models.Model):
    id = models.SmallAutoField(primary_key=True)
    lista_precios = models.ForeignKey(ListaPrecios, on_delete=models.CASCADE, blank=True, null=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, blank=True, null=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)
    precio_bulto = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)

    class Meta:
        db_table = 'lista_precios_producto'
        constraints = [
            models.UniqueConstraint(
                fields=['lista_precios', 'producto'],
                name='unique_lista_producto'
            )
        ]