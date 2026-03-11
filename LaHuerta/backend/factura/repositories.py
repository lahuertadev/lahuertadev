from django.db import transaction
from .models import Factura
from .interfaces import IBillRepository

class BillRepository(IBillRepository):

    def get_all(self, cliente_id=None, cuit=None, razon_social=None,
                importe_min=None, importe_max=None, fecha_desde=None, fecha_hasta=None):
        qs = Factura.objects.select_related('cliente', 'tipo_factura').all()
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        if cuit:
            qs = qs.filter(cliente__cuit__icontains=cuit)
        if razon_social:
            qs = qs.filter(cliente__razon_social__icontains=razon_social)
        if importe_min is not None:
            qs = qs.filter(importe__gte=importe_min)
        if importe_max is not None:
            qs = qs.filter(importe__lte=importe_max)
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)
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