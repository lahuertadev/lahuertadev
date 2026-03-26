from django.db import models
from producto.models import Producto
from compra.models import Compra
from tipo_venta.models import TipoVenta

class CompraProducto(models.Model):
    id = models.AutoField(primary_key=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    tipo_venta = models.ForeignKey(TipoVenta, on_delete=models.SET_NULL, null=True, blank=True)
    cantidad_producto = models.FloatField()
    precio_bulto = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'compra_producto'