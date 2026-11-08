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
