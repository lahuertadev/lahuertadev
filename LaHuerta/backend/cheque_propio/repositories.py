from .models import OwnCheck
from .interfaces import IOwnCheckRepository


class OwnCheckRepository(IOwnCheckRepository):

    def get_all(self, state=None, bank=None, available=None):
        queryset = OwnCheck.objects.select_related('banco', 'pago_compra__proveedor').prefetch_related(
            'pago_compra__purchase_applications__compra',
            'payment_uses__pago_compra__proveedor',
            'payment_uses__pago_compra__purchase_applications__compra',
        ).all()
        if state:
            queryset = queryset.filter(estado=state)
        if bank:
            queryset = queryset.filter(banco__descripcion__icontains=bank)
        if available:
            queryset = queryset.filter(estado=OwnCheck.State.EMITIDO, pago_compra__isnull=True)
        return queryset

    def get_by_id(self, id):
        return (
            OwnCheck.objects
            .select_related('banco', 'pago_compra__proveedor')
            .prefetch_related(
                'pago_compra__purchase_applications__compra',
                'payment_uses__pago_compra__proveedor',
                'payment_uses__pago_compra__purchase_applications__compra',
            )
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

