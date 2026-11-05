import pytest
from datetime import date
from decimal import Decimal

from reporte.repositories import ReportRepository
from core.tests.factories import make_bill, make_bill_type, make_client, make_client_payment, make_payment_type


@pytest.fixture
def db_setup(db):
    tipo_factura = make_bill_type(descripcion='A')
    tipo_pago = make_payment_type(descripcion='Efectivo')

    cliente = make_client(razon_social='Cliente Test SA')
    otro_cliente = make_client(razon_social='Otro Cliente SA')
    return {
        'cliente': cliente,
        'otro_cliente': otro_cliente,
        'tipo_factura': tipo_factura,
        'tipo_pago': tipo_pago,
    }


@pytest.fixture
def repo():
    return ReportRepository()


class TestReportRepositoryGetBills:
    def test_retorna_facturas_del_cliente_en_rango(self, db_setup, repo):
        cliente = db_setup['cliente']
        tipo_factura = db_setup['tipo_factura']

        make_bill(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 5), total=Decimal('500'))
        make_bill(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 20), total=Decimal('300'))
        make_bill(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 4, 1), total=Decimal('200'))

        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 2

    def test_no_retorna_facturas_de_otro_cliente(self, db_setup, repo):
        cliente = db_setup['cliente']
        otro = db_setup['otro_cliente']
        tipo_factura = db_setup['tipo_factura']

        make_bill(cliente=otro, tipo_factura=tipo_factura, fecha=date(2025, 3, 5), total=Decimal('500'))

        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 0

    def test_retorna_vacio_si_no_hay_facturas(self, db_setup, repo):
        cliente = db_setup['cliente']
        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert result == []

    def test_incluye_fechas_limite(self, db_setup, repo):
        cliente = db_setup['cliente']
        tipo_factura = db_setup['tipo_factura']

        make_bill(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 1), total=Decimal('100'))
        make_bill(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 31), total=Decimal('100'))

        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 2


class TestReportRepositoryGetPayments:
    def test_retorna_pagos_del_cliente_en_rango(self, db_setup, repo):
        cliente = db_setup['cliente']
        tipo_pago = db_setup['tipo_pago']

        make_client_payment(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 10), importe=Decimal('400'))
        make_client_payment(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 25), importe=Decimal('200'))
        make_client_payment(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 4, 5), importe=Decimal('100'))

        result = list(repo.get_payments(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 2

    def test_no_retorna_pagos_de_otro_cliente(self, db_setup, repo):
        cliente = db_setup['cliente']
        otro = db_setup['otro_cliente']
        tipo_pago = db_setup['tipo_pago']

        make_client_payment(cliente=otro, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 10), importe=Decimal('400'))

        result = list(repo.get_payments(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 0

    def test_retorna_vacio_si_no_hay_pagos(self, db_setup, repo):
        cliente = db_setup['cliente']
        result = list(repo.get_payments(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert result == []
