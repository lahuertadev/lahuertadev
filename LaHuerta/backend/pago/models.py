from django.db import models
from cliente.models import Cliente
from tipo_pago.models import TipoPago

class Pago(models.Model):
    fecha_pago = models.DateField()
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    observaciones = models.CharField(max_length=200)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    tipo_pago = models.ForeignKey(TipoPago, on_delete=models.CASCADE)

    def __str__(self):
        return f'Cliente: {self.cliente.razon_social} con importe {self.importe}'

    class Meta:
        db_table = 'pago' 