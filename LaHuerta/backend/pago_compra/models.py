from django.db import models
from pago.models import Pago
from compra.models import Compra

# Create your models here.
class PagoCompra(models.Model):
    pago = models.ForeignKey(Pago, on_delete=models.CASCADE)
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE)
    fecha_pago = models.DateTimeField()
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(max_length=8, blank=True, null=True)

    class Meta:
        db_table = 'pago_compra'