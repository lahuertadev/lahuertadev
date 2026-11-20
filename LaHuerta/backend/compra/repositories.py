from django.db.models import Q, Sum, DecimalField, Value
from django.db.models.functions import Coalesce
from .models import Compra
from pago_compra.models import PagoCompra
from .interfaces import IBuyRepository
from pago_compra.constants import PaymentState


def _annotate_payments(qs):
    '''total_payments: lo que los pagos vigentes le imputan a la compra.'''
    return qs.annotate(
        total_payments=Coalesce(
            Sum(
                'payment_applications__importe',
                filter=Q(payment_applications__pago_compra__estado_pago=PaymentState.VIGENTE),
            ),
            Value(0, output_field=DecimalField()),
        )
    )


class BuyRepository(IBuyRepository):

    def get_all(self, proveedor_id=None, fecha_desde=None, fecha_hasta=None,
                importe_min=None, importe_max=None, supplier=None):
        qs = _annotate_payments(Compra.objects.select_related('proveedor').prefetch_related('proveedor__contactos'))

        if proveedor_id:
            qs = qs.filter(proveedor_id=proveedor_id)
        if supplier:
            qs = qs.filter(self._supplier_search(supplier))
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)
        if importe_min is not None:
            qs = qs.filter(importe__gte=importe_min)
        if importe_max is not None:
            qs = qs.filter(importe__lte=importe_max)

        return qs.order_by('-fecha', '-id')

    @staticmethod
    def _supplier_search(text):
        '''Igual que en Pagos de Compras: un número busca por puesto exacto o por nombre; un texto, solo por nombre.'''
        text = text.strip()
        condition = Q(proveedor__nombre__icontains=text)
        if text.isdigit():
            condition |= Q(proveedor__puesto=int(text))
        return condition

    def get_by_id(self, id):
        return (
            _annotate_payments(Compra.objects.select_related('proveedor'))
            .prefetch_related(
                'payment_applications__pago_compra__tipo_pago',
                'payment_applications__pago_compra__client_check_uses__cheque__estado',
                'payment_applications__pago_compra__own_check_uses__cheque_propio',
            )
            .filter(id=id)
            .first()
        )

    def create(self, proveedor, fecha, importe, senia):
        compra = Compra(
            proveedor=proveedor,
            fecha=fecha,
            importe=importe,
            senia=senia,
        )
        compra.save()
        return compra

    def save(self, buy):
        buy.save()
        return buy

    def delete(self, buy):
        buy.delete()

    def get_applied_payments(self, buy):
        return list(PagoCompra.objects.filter(purchase_applications__compra=buy).distinct().order_by('id'))
