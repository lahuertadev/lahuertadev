# Estados de pago de una compra (se calculan, no se guardan: ver BuyService.calculate_payment_status).
PAYMENT_STATUS_PENDING = 'PENDIENTE'
PAYMENT_STATUS_PARTIAL = 'PARCIAL'
PAYMENT_STATUS_PAID = 'ABONADO'

# Solapas del listado (parámetro payment_status): por pagar son las pendientes y las parciales (tienen saldo).
LIST_STATUS_UNPAID = 'por_pagar'
LIST_STATUS_PAID = 'abonadas'
LIST_STATUS_CHOICES = [LIST_STATUS_UNPAID, LIST_STATUS_PAID]
