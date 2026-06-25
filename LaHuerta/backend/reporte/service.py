from datetime import date, timedelta
from calendar import monthrange
from decimal import Decimal

from cliente.interfaces import IClientRepository
from .interfaces import IReportRepository
from .exceptions import ClientNotFoundException
from . import constants as report_constants
from factura.constants import DEBIT_NOTE_CODES


def get_date_range(period: str, ref_date: date) -> tuple[date, date]:
    '''
    Calcula el rango de fechas (date_from, date_to) para un período dado.

    - dia: devuelve ref_date como inicio y fin.
    - semana: devuelve el lunes y el domingo de la semana que contiene ref_date.
    - mes: devuelve el primer y último día del mes de ref_date.
    - anio: devuelve el 1 de enero y el 31 de diciembre del año de ref_date.
    '''
    if period == 'dia':
        return ref_date, ref_date
    elif period == 'semana':
        monday = ref_date - timedelta(days=ref_date.weekday())
        sunday = monday + timedelta(days=6)
        return monday, sunday
    elif period == 'mes':
        first = ref_date.replace(day=1)
        last = ref_date.replace(day=monthrange(ref_date.year, ref_date.month)[1])
        return first, last
    elif period == 'anio':
        return date(ref_date.year, 1, 1), date(ref_date.year, 12, 31)


def build_chart(period: str, date_from: date, date_to: date, bills, payments, credit_notes) -> list:
    '''
    Construye los datos del gráfico de barras agrupando facturas, pagos y NC según el período.

    Cada entrada del resultado es un dict con:
        - label: etiqueta del eje X (ej. "10", "Mar", "Lun 17/03").
        - billed: total facturado (facturas + ND) en ese intervalo.
        - paid: total cobrado en efectivo en ese intervalo.
        - credited: total acreditado en NC en ese intervalo.
        - settled: paid + credited (lo que se muestra como barra "Saldado").

    Agrupación por período:
        - dia: un único punto con el total del día.
        - semana: un punto por cada día (lunes a domingo), etiquetado con nombre y fecha.
        - mes: un punto por cada día del mes, etiquetado con el número de día.
        - anio: un punto por mes, etiquetado con el nombre abreviado del mes.
    '''
    def _entry(label):
        return {'label': label, 'billed': Decimal('0'), 'paid': Decimal('0'), 'credited': Decimal('0')}

    def _settle(chart):
        for e in chart.values():
            e['settled'] = e['paid'] + e['credited']
        return list(chart.values())

    if period == 'dia':
        total_billed = sum((b.total for b in bills), Decimal('0'))
        total_paid = sum((p.importe for p in payments), Decimal('0'))
        total_credited = sum((cn.total for cn in credit_notes), Decimal('0'))
        return [{'label': date_from.strftime('%d/%m'), 'billed': total_billed, 'paid': total_paid,
                 'credited': total_credited, 'settled': total_paid + total_credited}]

    if period in ('semana', 'mes'):
        chart = {}
        current = date_from
        while current <= date_to:
            if period == 'semana':
                label = f"{report_constants.DAY_LABELS[current.weekday()]} {current.strftime('%d/%m')}"
            else:
                label = current.strftime('%d')
            chart[current] = _entry(label)
            current += timedelta(days=1)

        for b in bills:
            if b.fecha in chart:
                chart[b.fecha]['billed'] += b.total
        for p in payments:
            if p.fecha_pago in chart:
                chart[p.fecha_pago]['paid'] += p.importe
        for cn in credit_notes:
            if cn.fecha in chart:
                chart[cn.fecha]['credited'] += cn.total

        return _settle(chart)

    if period == 'anio':
        chart = {}
        for month in range(1, 13):
            key = date(date_from.year, month, 1)
            chart[key] = _entry(report_constants.MONTH_LABELS[month - 1])

        for b in bills:
            key = b.fecha.replace(day=1)
            if key in chart:
                chart[key]['billed'] += b.total
        for p in payments:
            key = p.fecha_pago.replace(day=1)
            if key in chart:
                chart[key]['paid'] += p.importe
        for cn in credit_notes:
            key = cn.fecha.replace(day=1)
            if key in chart:
                chart[key]['credited'] += cn.total

        return _settle(chart)


class ReportService:

    def __init__(self, report_repository: IReportRepository, client_repository: IClientRepository):
        self.report_repository = report_repository
        self.client_repository = client_repository

    def get_client_report(self, client_id: int, period: str, ref_date: date) -> dict:
        '''
        Genera el reporte completo de un cliente para el período indicado.

        Lanza ClientNotFoundException si el cliente no existe.

        Retorna un dict con:
            - client: instancia del cliente.
            - period: período solicitado ('dia', 'semana', 'mes', 'anio').
            - date_from / date_to: rango de fechas calculado.
            - kpis: total_billed, total_paid y pending_balance del período.
            - chart: datos para el gráfico de barras (ver build_chart).
            - bills: facturas del cliente en el período.
            - payments: pagos del cliente en el período.
        '''
        client = self.client_repository.get_client_by_id(client_id)
        if not client:
            raise ClientNotFoundException('Cliente no encontrado.')

        date_from, date_to = get_date_range(period, ref_date)

        bills = list(self.report_repository.get_bills(client_id, date_from, date_to))
        payments = list(self.report_repository.get_payments(client_id, date_from, date_to))
        credit_notes = list(self.report_repository.get_credit_notes(client_id, date_from, date_to))

        total_billed = sum((b.total for b in bills), Decimal('0'))
        total_paid = sum((p.importe for p in payments), Decimal('0'))
        total_credited = sum((cn.total for cn in credit_notes), Decimal('0'))
        total_debit_notes = sum((b.total for b in bills if b.tipo_factura.codigo_afip in DEBIT_NOTE_CODES), Decimal('0'))
        total_invoiced = total_billed - total_debit_notes
        pending_balance = total_billed - total_credited - total_paid

        return {
            'client': client,
            'period': period,
            'date_from': date_from,
            'date_to': date_to,
            'kpis': {
                'total_billed': total_billed,
                'total_invoiced': total_invoiced,
                'total_debit_notes': total_debit_notes,
                'total_paid': total_paid,
                'total_credited': total_credited,
                'pending_balance': pending_balance,
                'account_balance': client.cuenta_corriente,
            },
            'chart': build_chart(period, date_from, date_to, bills, payments, credit_notes),
            'bills': bills,
            'payments': payments,
            'credit_notes': credit_notes,
        }
