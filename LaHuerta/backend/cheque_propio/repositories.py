from decimal import Decimal
from django.db.models import Sum, Value, F
from django.db.models.functions import Coalesce
from .models import OwnCheck
from .interfaces import IOwnCheckRepository


class OwnCheckRepository(IOwnCheckRepository):

    def get_all(self, state=None, bank=None, available=None, supplier_id=None):
        queryset = OwnCheck.objects.select_related('banco').prefetch_related(
            'pagocompra_set__compra__proveedor',
        ).all()
        if state:
            queryset = queryset.filter(estado=state)
        if bank:
            queryset = queryset.filter(banco__descripcion__icontains=bank)
        if available:
            queryset = queryset.annotate(
                total_used=Coalesce(Sum('pagocompra__importe_abonado'), Value(Decimal('0')))
            ).filter(estado=OwnCheck.State.EMITIDO, total_used__lt=F('importe'))
            if supplier_id:
                checks_other_supplier = (
                    OwnCheck.objects
                    .filter(pagocompra__compra__proveedor_id__isnull=False)
                    .exclude(pagocompra__compra__proveedor_id=supplier_id)
                    .values_list('numero', flat=True)
                    .distinct()
                )
                queryset = queryset.exclude(numero__in=checks_other_supplier)
        return queryset

    def get_by_id(self, numero):
        return (
            OwnCheck.objects
            .select_related('banco')
            .prefetch_related('pagocompra_set__compra__proveedor')
            .filter(numero=numero)
            .first()
        )

    def create(self, data: dict):
        own_check = OwnCheck(**data)
        own_check.save()
        return own_check

    def update(self, own_check, data: dict):
        for key, value in data.items():
            setattr(own_check, key, value)
        own_check.save()
        return own_check

    def delete(self, own_check):
        own_check.delete()
