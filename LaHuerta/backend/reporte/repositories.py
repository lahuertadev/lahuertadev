from datetime import date
from factura.models import Factura
from factura.constants import CREDIT_NOTE_CODES
from pago_cliente.constants import PaymentState
from pago_cliente.models import PagoCliente
from .interfaces import IReportRepository


class ReportRepository(IReportRepository):

    def get_bills(self, client_id: int, date_from: date, date_to: date):
        return (
            Factura.objects
            .select_related('tipo_factura', 'cliente', 'factura_asociada__tipo_factura')
            .prefetch_related('facturaproducto_set__producto', 'facturaproducto_set__tipo_venta')
            .filter(
                cliente_id=client_id,
                fecha__range=(date_from, date_to),
            )
            .exclude(tipo_factura__codigo_afip__in=CREDIT_NOTE_CODES)
            .order_by('fecha')
        )

    def get_credit_notes(self, client_id: int, date_from: date, date_to: date):
        return (
            Factura.objects
            .select_related('tipo_factura', 'cliente', 'factura_asociada__tipo_factura')
            .prefetch_related('facturaproducto_set__producto', 'facturaproducto_set__tipo_venta')
            .filter(
                cliente_id=client_id,
                fecha__range=(date_from, date_to),
                tipo_factura__codigo_afip__in=CREDIT_NOTE_CODES,
            )
            .order_by('fecha')
        )

    def get_payments(self, client_id: int, date_from: date, date_to: date):
        '''Pagos vigentes del cliente en el período: los anulados no cuentan en el reporte.'''
        return (
            PagoCliente.objects
            .select_related('tipo_pago')
            .filter(
                cliente_id=client_id,
                fecha_pago__range=(date_from, date_to),
                estado_pago=PaymentState.VIGENTE,
            )
            .order_by('fecha_pago')
        )
