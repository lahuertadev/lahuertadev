from django.db import models
from pago.models import Pago
from factura.models import Factura

class PagoFactura(models.Model):
    pago = models.ForeignKey(Pago, on_delete=models.CASCADE)
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE)
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'Pago {self.pago.id} - Factura {self.factura.id} - Importe Abonado {self.importe_abonado}'
    
    class Meta:
        db_table = 'pago_factura' 
        
