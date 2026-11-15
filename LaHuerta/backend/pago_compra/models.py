from django.db import models
from compra.models import Compra
from proveedor.models import Proveedor
from tipo_pago.models import TipoPago
from .constants import PaymentState


class PagoCompra(models.Model):
    '''
    Pago a un proveedor. Se aplica a una compra, a varias o a ninguna: lo que no se aplica
    a ninguna compra queda a cuenta del saldo del proveedor.
    '''
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    importe_abonado = models.DecimalField(max_digits=10, decimal_places=2)
    estado_pago = models.CharField(max_length=8, choices=PaymentState.choices, default=PaymentState.VIGENTE)
    fecha_anulacion = models.DateField(null=True, blank=True)
    tipo_pago = models.ForeignKey(TipoPago, on_delete=models.PROTECT)
    fecha_pago = models.DateField()
    compras = models.ManyToManyField(Compra,through='ImputacionPago',blank=True)

    class Meta:
        db_table = 'pago_compra'


class ImputacionPago(models.Model):
    '''
    Imputación de un pago a proveedor a una compra: cuánto del pago cubre esa compra.
    Lo que el pago no imputa a ninguna compra queda a cuenta y no tiene fila acá: es
    importe_abonado menos la suma de sus imputaciones.
    Si se elimina la compra, el pago se conserva y lo imputado pasa a quedar a cuenta.
    '''
    pago_compra = models.ForeignKey(PagoCompra, on_delete=models.CASCADE, related_name='purchase_applications')
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='payment_applications')
    importe = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'imputacion_pago'
        constraints = [
            models.UniqueConstraint(fields=['pago_compra', 'compra'], name='unique_purchase_per_payment'),
        ]


class PagoCompraChequePropio(models.Model):
    '''
    Historial de los cheques emitidos con que se hizo cada pago, para que un pago anulado los
    siga mostrando. El pago en el que está usado hoy un cheque lo indica cheque_propio.pago_compra.
    '''
    pago_compra = models.ForeignKey(PagoCompra, on_delete=models.CASCADE, related_name='own_check_uses')
    cheque_propio = models.ForeignKey('cheque_propio.OwnCheck', on_delete=models.PROTECT, related_name='payment_uses')
    importe = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'pago_compra_cheque_propio'
        constraints = [
            models.UniqueConstraint(fields=['pago_compra', 'cheque_propio'], name='unique_own_check_per_payment'),
        ]


class PagoCompraCheque(models.Model):
    '''
    Historial de los cheques de clientes con que se hizo cada pago, para que un pago anulado los
    siga mostrando. El cheque endosado hoy a un pago lo indica cheque.pago_compra.
    '''
    pago_compra = models.ForeignKey(PagoCompra, on_delete=models.CASCADE, related_name='client_check_uses')
    cheque = models.ForeignKey('cheque.Cheque', on_delete=models.PROTECT, related_name='purchase_payment_uses')
    importe = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'pago_compra_cheque'
        constraints = [
            models.UniqueConstraint(fields=['pago_compra', 'cheque'], name='unique_client_check_per_payment'),
        ]
