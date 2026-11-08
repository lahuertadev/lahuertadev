from django.db.models import Q
from .models import PagoCompra, PagoCompraChequePropio
from .constants import PAYMENT_KIND_PURCHASE, PAYMENT_KIND_ON_ACCOUNT
from .interfaces import IPurchasePaymentRepository


class PurchasePaymentRepository(IPurchasePaymentRepository):

    def _base_queryset(self):
        return (
            PagoCompra.objects
            .select_related('proveedor', 'compra__proveedor', 'tipo_pago')
            .prefetch_related('cheque_set__banco', 'cheque_set__estado', 'own_check_uses__cheque_propio__banco')
        )

    def get_all(self, compra_id=None, supplier_id=None, supplier=None, kind=None, payment_type_id=None,
                amount_min=None, amount_max=None, date_from=None, date_to=None):
        qs = self._base_queryset().all()
        if compra_id:
            qs = qs.filter(compra_id=compra_id)
        if supplier_id:
            qs = qs.filter(proveedor_id=supplier_id)
        if supplier:
            qs = qs.filter(self._supplier_search(supplier))
        if kind == PAYMENT_KIND_PURCHASE:
            qs = qs.filter(compra__isnull=False)
        elif kind == PAYMENT_KIND_ON_ACCOUNT:
            qs = qs.filter(compra__isnull=True)
        if payment_type_id:
            qs = qs.filter(tipo_pago_id=payment_type_id)
        if amount_min is not None:
            qs = qs.filter(importe_abonado__gte=amount_min)
        if amount_max is not None:
            qs = qs.filter(importe_abonado__lte=amount_max)
        if date_from:
            qs = qs.filter(fecha_pago__gte=date_from)
        if date_to:
            qs = qs.filter(fecha_pago__lte=date_to)
        return qs.order_by('-fecha_pago', '-id')

    @staticmethod
    def _supplier_search(text):
        '''Un número busca por puesto exacto o por nombre; un texto, solo por nombre.'''
        text = text.strip()
        condition = Q(proveedor__nombre__icontains=text)
        if text.isdigit():
            condition |= Q(proveedor__puesto=int(text))
        return condition

    def get_by_id(self, id):
        return self._base_queryset().filter(id=id).first()

    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago, compra=None):
        payment = PagoCompra(
            proveedor=proveedor,
            compra=compra,
            importe_abonado=importe_abonado,
            tipo_pago=tipo_pago,
            fecha_pago=fecha_pago,
        )
        payment.save()
        return payment

    def add_own_check_use(self, payment, own_check, amount):
        return PagoCompraChequePropio.objects.create(pago_compra=payment, cheque_propio=own_check, importe=amount)

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        payment.save(update_fields=list(data.keys()))
        return payment

    def delete(self, payment):
        payment.delete()
