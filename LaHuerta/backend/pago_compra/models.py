from django.db import models
from compra.models import Compra

class PagoCompra(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(max_length=8, blank=True, null=True)

    class Meta:
        db_table = 'pago_compra'