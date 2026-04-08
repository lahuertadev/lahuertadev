from .models import Cheque
from .interfaces import ICheckRepository


class CheckRepository(ICheckRepository):

    def get_all(self, banco=None, estado=None, endosado=None, fecha_deposito_desde=None, fecha_deposito_hasta=None):
        queryset = Cheque.objects.select_related('banco', 'estado', 'pago_cliente', 'pago_compra').all()
        if banco:
            queryset = queryset.filter(banco__descripcion__icontains=banco)
        if estado:
            queryset = queryset.filter(estado__descripcion__icontains=estado)
        if endosado is not None:
            queryset = queryset.filter(endosado=endosado)
        if fecha_deposito_desde:
            queryset = queryset.filter(fecha_deposito__gte=fecha_deposito_desde)
        if fecha_deposito_hasta:
            queryset = queryset.filter(fecha_deposito__lte=fecha_deposito_hasta)
        return queryset

    def get_by_id(self, numero):
        return (
            Cheque.objects
            .select_related('banco', 'estado', 'pago_cliente', 'pago_compra')
            .filter(numero=numero)
            .first()
        )

    def create(self, data: dict):
        cheque = Cheque(**data)
        cheque.save()
        return cheque

    def update(self, cheque, data: dict):
        for key, value in data.items():
            setattr(cheque, key, value)
        cheque.save()
        return cheque

    def delete(self, cheque):
        cheque.delete()
