from django.db import models

# Tipo de pago a proveedor según tenga o no una compra asociada (DEV-141).
PAYMENT_KIND_PURCHASE = 'COMPRA'
PAYMENT_KIND_ON_ACCOUNT = 'A_CUENTA'

PAYMENT_KIND_CHOICES = [PAYMENT_KIND_PURCHASE, PAYMENT_KIND_ON_ACCOUNT]

PAYMENT_KIND_LABELS = {
    PAYMENT_KIND_PURCHASE: 'Pago de compras',
    PAYMENT_KIND_ON_ACCOUNT: 'Pago a cuenta',
}

# Descripción de los tipos de pago con cheque (catálogo tipo_pago, registros del sistema).
PAYMENT_TYPE_CHECK = 'Cheque'
PAYMENT_TYPE_OWN_CHECK = 'Cheque Propio'


class PaymentState(models.TextChoices):
    '''
    Estado de un pago a proveedor (DEV-150). Un pago no se elimina: se anula. Al anularlo se
    revierten sus efectos (cuenta corriente, compras y cheques) y el pago queda como registro.
    '''
    VIGENTE = 'VIGENTE', 'Vigente'
    ANULADO = 'ANULADO', 'Anulado'


# Estados de un cheque (de cliente o emitido) que se cayó: su importe ya se sacó del pago.
DROPPED_CHECK_STATES = ('RECHAZADO', 'ANULADO')
# Cómo se muestra en un pago anulado un cheque que quedó libre (volvió a cartera o a estar disponible).
CHECK_STATE_RELEASED = 'LIBERADO'
