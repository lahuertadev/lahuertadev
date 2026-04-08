from .models import PagoCompra
from .interfaces import IPurchasePaymentRepository


class PurchasePaymentRepository(IPurchasePaymentRepository):

    def get_all(self, compra_id=None):
        qs = (
            PagoCompra.objects
            .select_related('compra__proveedor', 'tipo_pago')
            .prefetch_related('cheque_set__banco', 'cheque_set__estado')
            .all()
        )
        if compra_id:
            qs = qs.filter(compra_id=compra_id)
        return qs

    def get_by_id(self, id):
        return (
            PagoCompra.objects
            .select_related('compra__proveedor', 'tipo_pago')
            .prefetch_related('cheque_set__banco', 'cheque_set__estado')
            .filter(id=id)
            .first()
        )

    def create(self, compra, importe_abonado, tipo_pago, fecha_pago):
        payment = PagoCompra(
            compra=compra,
            importe_abonado=importe_abonado,
            tipo_pago=tipo_pago,
            fecha_pago=fecha_pago,
        )
        payment.save()
        return payment

    def delete(self, payment):
        payment.delete()
