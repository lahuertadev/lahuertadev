from .models import Cheque
from .interfaces import ICheckRepository


class CheckRepository(ICheckRepository):

    def get_all(self):
        return (
            Cheque.objects
            .select_related('banco', 'estado', 'pago_cliente', 'pago_compra')
            .all()
        )

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
