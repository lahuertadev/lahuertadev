from datetime import date
from factura.models import Factura
from pago_cliente.models import PagoCliente
from .interfaces import IReportRepository


class ReportRepository(IReportRepository):

    def get_bills(self, client_id: int, date_from: date, date_to: date):
        return (
            Factura.objects
            .select_related('tipo_factura')
            .filter(
                cliente_id=client_id,
                fecha__range=(date_from, date_to),
            )
            .order_by('fecha')
        )

    def get_payments(self, client_id: int, date_from: date, date_to: date):
        return (
            PagoCliente.objects
            .select_related('tipo_pago')
            .filter(
                cliente_id=client_id,
                fecha_pago__range=(date_from, date_to),
            )
            .order_by('fecha_pago')
        )
