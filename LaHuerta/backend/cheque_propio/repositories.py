from decimal import Decimal
from django.db.models import Sum, Value, F
from django.db.models.functions import Coalesce
from .models import OwnCheck
from .interfaces import IOwnCheckRepository


class OwnCheckRepository(IOwnCheckRepository):

    def get_all(self, state=None, bank=None, available=None, supplier_id=None):
        queryset = OwnCheck.objects.select_related('banco').prefetch_related(
            'pagocompra_set__proveedor',
            'payment_uses__pago_compra__compra',
        ).all()
        if state:
            queryset = queryset.filter(estado=state)
        if bank:
            queryset = queryset.filter(banco__descripcion__icontains=bank)
        if available:
            queryset = queryset.annotate(
                total_used=Coalesce(Sum('payment_uses__importe'), Value(Decimal('0')))
            ).filter(estado=OwnCheck.State.EMITIDO, total_used__lt=F('importe'))
            if supplier_id:
                checks_other_supplier = (
                    OwnCheck.objects
                    .filter(pagocompra__proveedor_id__isnull=False)
                    .exclude(pagocompra__proveedor_id=supplier_id)
                    .values_list('id', flat=True)
                    .distinct()
                )
                queryset = queryset.exclude(id__in=checks_other_supplier)
        return queryset

    def get_by_id(self, id):
        return (
            OwnCheck.objects
            .select_related('banco')
            .prefetch_related('pagocompra_set__proveedor', 'payment_uses__pago_compra__compra')
            .filter(id=id)
            .first()
        )

    def exists_duplicate(self, number, bank, exclude_id=None):
        queryset = OwnCheck.objects.filter(numero=number, banco=bank)
        if exclude_id is not None:
            queryset = queryset.exclude(id=exclude_id)
        return queryset.exists()

    def create(self, data: dict):
        return OwnCheck.objects.create(**data)

    def update(self, own_check, data: dict):
        for key, value in data.items():
            setattr(own_check, key, value)
        own_check.save()
        return own_check

    def delete(self, own_check):
        own_check.delete()

    def get_payment_uses(self, own_check):
        return own_check.payment_uses.select_related('pago_compra__proveedor').all()

    def delete_payment_use(self, use):
        use.delete()
