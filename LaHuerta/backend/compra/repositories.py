from django.db.models import Sum, DecimalField, Value
from django.db.models.functions import Coalesce
from .models import Compra
from .interfaces import IBuyRepository


def _annotate_payments(qs):
    return qs.annotate(
        total_payments=Coalesce(
            Sum('pagocompra__importe_abonado'),
            Value(0, output_field=DecimalField()),
        )
    )


class BuyRepository(IBuyRepository):

    def get_all(self, proveedor_id=None, fecha_desde=None, fecha_hasta=None,
                importe_min=None, importe_max=None):
        qs = _annotate_payments(Compra.objects.select_related('proveedor'))

        if proveedor_id:
            qs = qs.filter(proveedor_id=proveedor_id)
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)
        if importe_min is not None:
            qs = qs.filter(importe__gte=importe_min)
        if importe_max is not None:
            qs = qs.filter(importe__lte=importe_max)

        return qs.order_by('-fecha', '-id')

    def get_by_id(self, id):
        return (
            _annotate_payments(Compra.objects.select_related('proveedor'))
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
