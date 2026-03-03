from django.db import transaction
from .models import Factura
from .interfaces import IBillRepository

class BillRepository(IBillRepository):

    def get_all(self, cliente_id=None):
        qs = Factura.objects.select_related('cliente', 'tipo_factura').all()
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs

    def get_by_id(self, id):
        return (
            Factura.objects
            .select_related('cliente', 'tipo_factura')
            .filter(id=id)
            .first()
        )

    def create(self, client, bill_type, date, amount):

        factura = Factura(
            cliente = client,
            tipo_factura = bill_type,
            fecha = date,
            importe = amount)

        factura.save()
        return factura

    def save(self, bill):
        bill.save()
        return bill
    
    def delete(self, bill):
        bill.delete()