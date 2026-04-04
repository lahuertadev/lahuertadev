from django.db import models
from compra.models import Compra
from tipo_pago.models import TipoPago


class PagoCompra(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(max_length=8, blank=True, null=True)
    tipo_pago = models.ForeignKey(TipoPago, on_delete=models.PROTECT)
    fecha_pago = models.DateField()

    class Meta:
        db_table = 'pago_compra'
