from django.db import models
from producto.models import Producto
from factura.models import Factura
from tipo_venta.models import TipoVenta

class FacturaProducto(models.Model):
    id = models.SmallAutoField(primary_key=True)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE)
    tipo_venta = models.ForeignKey(TipoVenta, on_delete=models.PROTECT)
    
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    precio_bulto = models.DecimalField(max_digits=10, decimal_places=2)
    

    class Meta:
        db_table = 'factura_producto'