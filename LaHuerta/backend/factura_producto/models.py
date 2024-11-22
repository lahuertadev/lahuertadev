from django.db import models
from producto.models import Producto
from factura.models import Factura

class FacturaProducto(models.Model):
    id = models.SmallAutoField(primary_key=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, blank=True, null=True)
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE, blank=True, null=True)
    cantidad_producto = models.FloatField(blank=True, null=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)
    precio_bulto = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)

    class Meta:
        db_table = 'factura_producto'