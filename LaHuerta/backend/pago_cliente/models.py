from django.db import models
from cliente.models import Cliente
from tipo_pago.models import TipoPago
from .constants import PaymentState


class PagoCliente(models.Model):
    fecha_pago = models.DateField()
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    observaciones = models.CharField(max_length=200, blank=True, null=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    tipo_pago = models.ForeignKey(TipoPago, on_delete=models.CASCADE)
    estado_pago = models.CharField(max_length=8, choices=PaymentState.choices, default=PaymentState.VIGENTE)
    fecha_anulacion = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'Pago de {self.cliente.razon_social} — ${self.importe} ({self.fecha_pago})'

    class Meta:
        db_table = 'pago_cliente'
