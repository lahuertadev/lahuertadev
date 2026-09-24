from .models import Cheque
from .interfaces import ICheckRepository


class CheckRepository(ICheckRepository):

    def get_all(self, bank=None, state=None, endorsed=None, deposit_date_from=None, deposit_date_to=None):
        queryset = Cheque.objects.select_related(
            'banco', 'estado', 'pago_cliente__cliente', 'pago_compra__compra__proveedor',
        ).all()
        if bank:
            queryset = queryset.filter(banco__descripcion__icontains=bank)
        if state:
            queryset = queryset.filter(estado__descripcion__icontains=state)
        if endorsed is not None:
            queryset = queryset.filter(endosado=endorsed)
        if deposit_date_from:
            queryset = queryset.filter(fecha_deposito__gte=deposit_date_from)
        if deposit_date_to:
            queryset = queryset.filter(fecha_deposito__lte=deposit_date_to)
        return queryset

    def get_by_id(self, id):
        return (
            Cheque.objects
            .select_related('banco', 'estado', 'pago_cliente__cliente', 'pago_compra__compra__proveedor')
            .filter(id=id)
            .first()
        )

    def exists_duplicate(self, number, bank, client, exclude_id=None):
        queryset = Cheque.objects.filter(numero=number, banco=bank, pago_cliente__cliente=client)
        if exclude_id is not None:
            queryset = queryset.exclude(id=exclude_id)
        return queryset.exists()

    def create(self, data: dict):
        check = Cheque(**data)
        check.save()
        return check

    def update(self, check, data: dict):
        for key, value in data.items():
            setattr(check, key, value)
        check.save()
        return check

    def delete(self, check):
        check.delete()
