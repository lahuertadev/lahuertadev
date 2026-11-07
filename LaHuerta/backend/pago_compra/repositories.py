from .models import PagoCompra
from .interfaces import IPurchasePaymentRepository


class PurchasePaymentRepository(IPurchasePaymentRepository):

    def _base_queryset(self):
        return (
            PagoCompra.objects
            .select_related('proveedor', 'compra__proveedor', 'tipo_pago', 'cheque_propio__banco')
            .prefetch_related('cheque_set__banco', 'cheque_set__estado')
        )

    def get_all(self, compra_id=None, supplier_id=None):
        qs = self._base_queryset().all()
        if compra_id:
            qs = qs.filter(compra_id=compra_id)
        if supplier_id:
            qs = qs.filter(proveedor_id=supplier_id)
        return qs

    def get_by_id(self, id):
        return self._base_queryset().filter(id=id).first()

    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago, compra=None, cheque_propio=None):
        payment = PagoCompra(
            proveedor=proveedor,
            compra=compra,
            importe_abonado=importe_abonado,
            tipo_pago=tipo_pago,
            fecha_pago=fecha_pago,
            cheque_propio=cheque_propio,
        )
        payment.save()
        return payment

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        payment.save(update_fields=list(data.keys()))
        return payment

    def delete(self, payment):
        payment.delete()
