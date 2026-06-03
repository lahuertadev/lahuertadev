from django.db import transaction
from django.db.models import Max
from .models import Factura
from .interfaces import IBillRepository

class BillRepository(IBillRepository):

    def get_all(self, client_id=None, cuit=None, business_name=None,
                amount_min=None, amount_max=None, date_from=None, date_to=None,
                bill_type_id=None):
        qs = Factura.objects.select_related('cliente', 'tipo_factura').all()
        if client_id:
            qs = qs.filter(cliente_id=client_id)
        if cuit:
            qs = qs.filter(cliente__cuit__icontains=cuit)
        if business_name:
            qs = qs.filter(cliente__razon_social__icontains=business_name)
        if amount_min is not None:
            qs = qs.filter(importe__gte=amount_min)
        if amount_max is not None:
            qs = qs.filter(importe__lte=amount_max)
        if date_from:
            qs = qs.filter(fecha__gte=date_from)
        if date_to:
            qs = qs.filter(fecha__lte=date_to)
        if bill_type_id:
            qs = qs.filter(tipo_factura_id=bill_type_id)
        return qs.order_by('-fecha', '-id')

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

    def get_last_receipt_number(self, bill_type_id: int) -> int:
        result = Factura.objects.filter(tipo_factura_id=bill_type_id).aggregate(Max('numero_comprobante'))
        return result['numero_comprobante__max'] or 0