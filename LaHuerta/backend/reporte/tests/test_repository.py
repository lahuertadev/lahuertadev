import pytest
from datetime import date
from decimal import Decimal

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_factura.models import TipoFactura
from tipo_pago.models import TipoPago
from cliente.models import Cliente
from factura.models import Factura
from pago_cliente.models import PagoCliente
from reporte.repositories import ReportRepository


@pytest.fixture
def db_setup(db):
    provincia = Provincia.objects.create(id='06', nombre='Buenos Aires')
    municipio = Municipio.objects.create(id='064270', nombre='CABA', provincia=provincia)
    localidad = Localidad.objects.create(id='0642701009', nombre='CABA', municipio=municipio)
    tipo_fact = TipoFacturacion.objects.create(descripcion='Factura A')
    condicion_iva = TipoCondicionIva.objects.create(descripcion='RI')
    tipo_factura = TipoFactura.objects.create(descripcion='A')
    tipo_pago = TipoPago.objects.create(descripcion='Efectivo')

    cliente = Cliente.objects.create(
        cuit='20123456789',
        razon_social='Cliente Test SA',
        cuenta_corriente=Decimal('0'),
        localidad=localidad,
        tipo_facturacion=tipo_fact,
        condicion_IVA=condicion_iva,
    )
    otro_cliente = Cliente.objects.create(
        cuit='20987654321',
        razon_social='Otro Cliente SA',
        cuenta_corriente=Decimal('0'),
        localidad=localidad,
        tipo_facturacion=tipo_fact,
        condicion_IVA=condicion_iva,
    )
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

        Factura.objects.create(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 5), importe=Decimal('500'))
        Factura.objects.create(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 20), importe=Decimal('300'))
        Factura.objects.create(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 4, 1), importe=Decimal('200'))

        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 2

    def test_no_retorna_facturas_de_otro_cliente(self, db_setup, repo):
        cliente = db_setup['cliente']
        otro = db_setup['otro_cliente']
        tipo_factura = db_setup['tipo_factura']

        Factura.objects.create(cliente=otro, tipo_factura=tipo_factura, fecha=date(2025, 3, 5), importe=Decimal('500'))

        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 0

    def test_retorna_vacio_si_no_hay_facturas(self, db_setup, repo):
        cliente = db_setup['cliente']
        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert result == []

    def test_incluye_fechas_limite(self, db_setup, repo):
        cliente = db_setup['cliente']
        tipo_factura = db_setup['tipo_factura']

        Factura.objects.create(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 1), importe=Decimal('100'))
        Factura.objects.create(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 31), importe=Decimal('100'))

        result = list(repo.get_bills(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 2


class TestReportRepositoryGetPayments:
    def test_retorna_pagos_del_cliente_en_rango(self, db_setup, repo):
        cliente = db_setup['cliente']
        tipo_pago = db_setup['tipo_pago']

        PagoCliente.objects.create(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 10), importe=Decimal('400'))
        PagoCliente.objects.create(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 25), importe=Decimal('200'))
        PagoCliente.objects.create(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 4, 5), importe=Decimal('100'))

        result = list(repo.get_payments(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 2

    def test_no_retorna_pagos_de_otro_cliente(self, db_setup, repo):
        cliente = db_setup['cliente']
        otro = db_setup['otro_cliente']
        tipo_pago = db_setup['tipo_pago']

        PagoCliente.objects.create(cliente=otro, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 10), importe=Decimal('400'))

        result = list(repo.get_payments(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert len(result) == 0

    def test_retorna_vacio_si_no_hay_pagos(self, db_setup, repo):
        cliente = db_setup['cliente']
        result = list(repo.get_payments(cliente.id, date(2025, 3, 1), date(2025, 3, 31)))
        assert result == []
