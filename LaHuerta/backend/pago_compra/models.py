from django.db import models
from compra.models import Compra
from proveedor.models import Proveedor
from tipo_pago.models import TipoPago


class PagoCompra(models.Model):
    '''
    Pago a un proveedor. 
    '''
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    compra = models.ForeignKey(Compra, null=True, blank=True, on_delete=models.CASCADE)
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(max_length=8, blank=True, null=True)
    tipo_pago = models.ForeignKey(TipoPago, on_delete=models.PROTECT)
    fecha_pago = models.DateField()
    # Un pago puede usar varios cheques emitidos y un cheque emitido repartirse entre varios
    # pagos del mismo proveedor; la tabla intermedia guarda cuánto se usa de cada uno.
    cheques_propios = models.ManyToManyField(
        'cheque_propio.OwnCheck',
        through='PagoCompraChequePropio',
        blank=True,
    )

    class Meta:
        db_table = 'pago_compra'


class PagoCompraChequePropio(models.Model):
    '''
    Uso de un cheque emitido en un pago a proveedor: cuánto del cheque se aplica a ese pago.
    '''
    pago_compra = models.ForeignKey(PagoCompra, on_delete=models.CASCADE, related_name='own_check_uses')
    cheque_propio = models.ForeignKey('cheque_propio.OwnCheck', on_delete=models.PROTECT, related_name='payment_uses')
    importe = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'pago_compra_cheque_propio'
        constraints = [
            models.UniqueConstraint(fields=['pago_compra', 'cheque_propio'], name='unique_own_check_per_payment'),
        ]
