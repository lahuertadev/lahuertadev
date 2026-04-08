from django.db.models import Sum
from .models import PagoFactura
from .interfaces import IBillPaymentRepository


class BillPaymentRepository(IBillPaymentRepository):

    def get_all(self, payment_id=None, bill_id=None):
        qs = PagoFactura.objects.select_related('pago_cliente', 'factura').all()
        if payment_id:
            qs = qs.filter(pago_cliente_id=payment_id)
        if bill_id:
            qs = qs.filter(factura_id=bill_id)
        return qs

    def get_by_id(self, id):
        return (
            PagoFactura.objects
            .select_related('pago_cliente', 'factura')
            .filter(id=id)
            .first()
        )

    def create(self, pago_cliente, factura, importe_abonado):
        record = PagoFactura(
            pago_cliente=pago_cliente,
            factura=factura,
            importe_abonado=importe_abonado,
        )
        record.save()
        return record

    def save(self, record):
        record.save()
        return record

    def delete(self, record):
        record.delete()

    def get_total_paid_for_bill(self, factura_id, exclude_id=None):
        '''
        Suma de todos los importes abonados para una factura.
        Si se pasa exclude_id, se excluye ese registro (útil al editar).
        '''
        qs = PagoFactura.objects.filter(factura_id=factura_id)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        result = qs.aggregate(total=Sum('importe_abonado'))
        return result['total'] or 0

