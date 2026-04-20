from .models import OwnCheck
from .interfaces import IOwnCheckRepository


class OwnCheckRepository(IOwnCheckRepository):

    def get_all(self, estado=None, banco=None):
        queryset = OwnCheck.objects.select_related(
            'banco',
            'pago_compra__compra__proveedor',
        ).all()
        if estado:
            queryset = queryset.filter(estado=estado)
        if banco:
            queryset = queryset.filter(banco__descripcion__icontains=banco)
        return queryset

    def get_by_id(self, numero):
        return (
            OwnCheck.objects
            .select_related('banco', 'pago_compra__compra__proveedor')
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
