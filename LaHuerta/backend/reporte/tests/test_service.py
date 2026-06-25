import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from factura.models import Factura
from pago_cliente.models import PagoCliente
from reporte.interfaces import IReportRepository
from reporte.service import ReportService, get_date_range, build_chart
from reporte.exceptions import ClientNotFoundException


# ── Fake repos ────────────────────────────────────────────────────────────────

class FakeReportRepo(IReportRepository):
    def __init__(self, bills=None, payments=None, credit_notes=None):
        self._bills = bills or []
        self._payments = payments or []
        self._credit_notes = credit_notes or []

    def get_bills(self, client_id, date_from, date_to):
        return self._bills

    def get_payments(self, client_id, date_from, date_to):
        return self._payments

    def get_credit_notes(self, client_id, date_from, date_to):
        return self._credit_notes


def make_bill(fecha, total, codigo_afip=1):
    b = Mock(spec=Factura)
    b.fecha = fecha
    b.total = Decimal(str(total))
    b.tipo_factura = Mock()
    b.tipo_factura.codigo_afip = codigo_afip
    return b


def make_debit_note(fecha, total):
    return make_bill(fecha, total, codigo_afip=7)


def make_payment(fecha_pago, importe):
    p = Mock(spec=PagoCliente)
    p.fecha_pago = fecha_pago
    p.importe = Decimal(str(importe))
    p.tipo_pago = Mock()
    return p


def make_client(id=1):
    c = Mock()
    c.id = id
    c.razon_social = 'Cliente Test'
    return c


def make_service(client=None, bills=None, payments=None, credit_notes=None):
    client_repo = Mock()
    client_repo.get_client_by_id.return_value = client or make_client()
    report_repo = FakeReportRepo(bills=bills, payments=payments, credit_notes=credit_notes)
    return ReportService(report_repository=report_repo, client_repository=client_repo)


# ── get_date_range ────────────────────────────────────────────────────────────

class TestGetDateRange:
    def test_dia(self):
        ref_date = date(2025, 3, 15)
        date_from, date_to = get_date_range('dia', ref_date)
        assert date_from == date_to == ref_date

    def test_semana_monday(self):
        ref_date = date(2025, 3, 17)  # lunes
        date_from, date_to = get_date_range('semana', ref_date)
        assert date_from == date(2025, 3, 17)
        assert date_to == date(2025, 3, 23)

    def test_semana_mid_week(self):
        ref_date = date(2025, 3, 19)  # miércoles
        date_from, date_to = get_date_range('semana', ref_date)
        assert date_from == date(2025, 3, 17)
        assert date_to == date(2025, 3, 23)

    def test_mes(self):
        ref_date = date(2025, 3, 15)
        date_from, date_to = get_date_range('mes', ref_date)
        assert date_from == date(2025, 3, 1)
        assert date_to == date(2025, 3, 31)

    def test_mes_febrero_bisiesto(self):
        ref_date = date(2024, 2, 10)
        _, date_to = get_date_range('mes', ref_date)
        assert date_to == date(2024, 2, 29)

    def test_anio(self):
        ref_date = date(2025, 6, 15)
        date_from, date_to = get_date_range('anio', ref_date)
        assert date_from == date(2025, 1, 1)
        assert date_to == date(2025, 12, 31)


# ── build_chart ───────────────────────────────────────────────────────────────

class TestBuildChart:
    def test_dia_sin_datos(self):
        chart = build_chart('dia', date(2025, 3, 15), date(2025, 3, 15), [], [], [])
        assert len(chart) == 1
        assert chart[0]['billed'] == Decimal('0')
        assert chart[0]['paid'] == Decimal('0')
        assert chart[0]['credited'] == Decimal('0')
        assert chart[0]['settled'] == Decimal('0')

    def test_dia_con_datos(self):
        bills = [make_bill(date(2025, 3, 15), '500')]
        payments = [make_payment(date(2025, 3, 15), '300')]
        credit_notes = [make_bill(date(2025, 3, 15), '100')]
        chart = build_chart('dia', date(2025, 3, 15), date(2025, 3, 15), bills, payments, credit_notes)
        assert chart[0]['billed'] == Decimal('500')
        assert chart[0]['paid'] == Decimal('300')
        assert chart[0]['credited'] == Decimal('100')
        assert chart[0]['settled'] == Decimal('400')

    def test_semana_tiene_7_puntos(self):
        chart = build_chart('semana', date(2025, 3, 17), date(2025, 3, 23), [], [], [])
        assert len(chart) == 7

    def test_mes_tiene_dias_del_mes(self):
        chart = build_chart('mes', date(2025, 3, 1), date(2025, 3, 31), [], [], [])
        assert len(chart) == 31

    def test_anio_tiene_12_puntos(self):
        chart = build_chart('anio', date(2025, 1, 1), date(2025, 12, 31), [], [], [])
        assert len(chart) == 12

    def test_anio_agrupa_por_mes(self):
        bills = [
            make_bill(date(2025, 3, 5), '1000'),
            make_bill(date(2025, 3, 20), '500'),
            make_bill(date(2025, 7, 1), '2000'),
        ]
        chart = build_chart('anio', date(2025, 1, 1), date(2025, 12, 31), bills, [], [])
        march = next(c for c in chart if c['label'] == 'Mar')
        july = next(c for c in chart if c['label'] == 'Jul')
        assert march['billed'] == Decimal('1500')
        assert july['billed'] == Decimal('2000')

    def test_mes_agrupa_por_dia(self):
        bills = [
            make_bill(date(2025, 3, 10), '400'),
            make_bill(date(2025, 3, 10), '100'),
        ]
        payments = [make_payment(date(2025, 3, 10), '200')]
        chart = build_chart('mes', date(2025, 3, 1), date(2025, 3, 31), bills, payments, [])
        day_10 = next(c for c in chart if c['label'] == '10')
        assert day_10['billed'] == Decimal('500')
        assert day_10['paid'] == Decimal('200')

    def test_nc_acumula_en_credited_y_settled(self):
        bills = [make_bill(date(2025, 3, 10), '1000')]
        payments = [make_payment(date(2025, 3, 10), '200')]
        credit_notes = [make_bill(date(2025, 3, 10), '300')]
        chart = build_chart('mes', date(2025, 3, 1), date(2025, 3, 31), bills, payments, credit_notes)
        day_10 = next(c for c in chart if c['label'] == '10')
        assert day_10['credited'] == Decimal('300')
        assert day_10['settled'] == Decimal('500')  # 200 pagado + 300 NC


# ── ReportService ─────────────────────────────────────────────────────────────

class TestReportService:
    def test_client_not_found(self):
        client_repo = Mock()
        client_repo.get_client_by_id.return_value = None
        service = ReportService(
            report_repository=FakeReportRepo(),
            client_repository=client_repo,
        )
        with pytest.raises(ClientNotFoundException):
            service.get_client_report(client_id=99, period='mes', ref_date=date(2025, 3, 1))

    def test_kpis_calculados_correctamente(self):
        bills = [make_bill(date(2025, 3, 5), '1000'), make_bill(date(2025, 3, 10), '500')]
        payments = [make_payment(date(2025, 3, 7), '700')]
        service = make_service(bills=bills, payments=payments)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['total_billed'] == Decimal('1500')
        assert report['kpis']['total_paid'] == Decimal('700')
        assert report['kpis']['pending_balance'] == Decimal('800')

    def test_pending_balance_negativo_cuando_pagos_superan_facturas(self):
        bills = [make_bill(date(2025, 3, 5), '300')]
        payments = [make_payment(date(2025, 3, 7), '500')]
        service = make_service(bills=bills, payments=payments)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['pending_balance'] == Decimal('-200')

    def test_report_incluye_client_y_period(self):
        client = make_client(id=5)
        service = make_service(client=client)

        report = service.get_client_report(client_id=5, period='semana', ref_date=date(2025, 3, 19))

        assert report['client'] == client
        assert report['period'] == 'semana'
        assert report['date_from'] == date(2025, 3, 17)
        assert report['date_to'] == date(2025, 3, 23)

    def test_report_sin_facturas_ni_pagos(self):
        service = make_service()
        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['total_billed'] == Decimal('0')
        assert report['kpis']['total_invoiced'] == Decimal('0')
        assert report['kpis']['total_debit_notes'] == Decimal('0')
        assert report['kpis']['total_paid'] == Decimal('0')
        assert report['kpis']['total_credited'] == Decimal('0')
        assert report['kpis']['pending_balance'] == Decimal('0')
        assert report['bills'] == []
        assert report['payments'] == []
        assert report['credit_notes'] == []

    def test_breakdown_facturas_y_nd(self):
        bills = [
            make_bill(date(2025, 3, 5), '1000'),
            make_debit_note(date(2025, 3, 10), '200'),
        ]
        service = make_service(bills=bills)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['total_billed'] == Decimal('1200')
        assert report['kpis']['total_invoiced'] == Decimal('1000')
        assert report['kpis']['total_debit_notes'] == Decimal('200')

    def test_nc_descuenta_del_pending_balance(self):
        bills = [make_bill(date(2025, 3, 5), '1000')]
        credit_notes = [make_bill(date(2025, 3, 10), '300')]
        service = make_service(bills=bills, credit_notes=credit_notes)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['total_billed'] == Decimal('1000')
        assert report['kpis']['total_credited'] == Decimal('300')
        assert report['kpis']['pending_balance'] == Decimal('700')

    def test_nc_en_periodo_diferente_no_afecta_facturas_de_otro_periodo(self):
        # NC del período sin facturas del mismo período → pending_balance negativo
        credit_notes = [make_bill(date(2025, 4, 5), '500')]
        service = make_service(credit_notes=credit_notes)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 4, 1))

        assert report['kpis']['total_billed'] == Decimal('0')
        assert report['kpis']['total_credited'] == Decimal('500')
        assert report['kpis']['pending_balance'] == Decimal('-500')

    def test_nc_y_pagos_acumulan_en_pending_balance(self):
        bills = [make_bill(date(2025, 3, 5), '2000')]
        payments = [make_payment(date(2025, 3, 10), '500')]
        credit_notes = [make_bill(date(2025, 3, 15), '300')]
        service = make_service(bills=bills, payments=payments, credit_notes=credit_notes)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['pending_balance'] == Decimal('1200')

    def test_credit_notes_se_devuelven_en_el_reporte(self):
        cn1 = make_bill(date(2025, 3, 5), '100')
        cn2 = make_bill(date(2025, 3, 10), '200')
        service = make_service(credit_notes=[cn1, cn2])

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['credit_notes'] == [cn1, cn2]
        assert report['kpis']['total_credited'] == Decimal('300')

    def test_solo_nd_sin_facturas(self):
        bills = [make_debit_note(date(2025, 3, 5), '500')]
        service = make_service(bills=bills)

        report = service.get_client_report(client_id=1, period='mes', ref_date=date(2025, 3, 1))

        assert report['kpis']['total_billed'] == Decimal('500')
        assert report['kpis']['total_invoiced'] == Decimal('0')
        assert report['kpis']['total_debit_notes'] == Decimal('500')
