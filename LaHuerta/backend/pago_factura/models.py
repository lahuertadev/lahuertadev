from django.db import models
from factura.models import Factura
from pago_cliente.models import PagoCliente


class PagoFactura(models.Model):
    pago_cliente = models.ForeignKey(PagoCliente, on_delete=models.CASCADE)
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE)
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'Pago {self.pago_cliente.id} — Factura {self.factura.id} — ${self.importe_abonado}'

    class Meta:
        db_table = 'pago_factura'

