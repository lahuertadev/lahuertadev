import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory

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
from reporte.views import ClientReportViewSet
from reporte.exceptions import ClientNotFoundException


@pytest.fixture
def factory():
    return APIRequestFactory()


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
    return {
        'cliente': cliente,
        'tipo_factura': tipo_factura,
        'tipo_pago': tipo_pago,
    }


def make_view():
    return ClientReportViewSet.as_view({'get': 'retrieve'})


class TestClientReportViewSet:
    def test_reporte_exitoso(self, factory, db_setup):
        cliente = db_setup['cliente']
        tipo_factura = db_setup['tipo_factura']
        tipo_pago = db_setup['tipo_pago']

        Factura.objects.create(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 10), importe=Decimal('1000'))
        PagoCliente.objects.create(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 15), importe=Decimal('600'))

        request = factory.get(f'/api/reportes/clientes/{cliente.id}/', {'period': 'mes', 'date': '2025-03-01'})
        view = make_view()
        response = view(request, pk=cliente.id)

        assert response.status_code == 200
        assert response.data['kpis']['total_billed'] == '1000.00'
        assert response.data['kpis']['total_paid'] == '600.00'
        assert response.data['kpis']['pending_balance'] == '400.00'
        assert response.data['period'] == 'mes'
        assert len(response.data['bills']) == 1
        assert len(response.data['payments']) == 1

    def test_cliente_no_encontrado_retorna_404(self, factory, db):
        service = Mock()
        service.get_client_report.side_effect = ClientNotFoundException('Cliente no encontrado.')

        request = factory.get('/api/reportes/clientes/999/', {'period': 'mes', 'date': '2025-03-01'})
        view = ClientReportViewSet.as_view({'get': 'retrieve'}, service=service)
        response = view(request, pk=999)

        assert response.status_code == 404
        assert 'no encontrado' in response.data['detail'].lower()

    def test_period_invalido_retorna_400(self, factory, db):
        request = factory.get('/api/reportes/clientes/1/', {'period': 'bimestre', 'date': '2025-03-01'})
        view = make_view()
        response = view(request, pk=1)

        assert response.status_code == 400

    def test_date_invalida_retorna_400(self, factory, db):
        request = factory.get('/api/reportes/clientes/1/', {'period': 'mes', 'date': 'no-es-fecha'})
        view = make_view()
        response = view(request, pk=1)

        assert response.status_code == 400

    def test_sin_params_retorna_400(self, factory, db):
        request = factory.get('/api/reportes/clientes/1/')
        view = make_view()
        response = view(request, pk=1)

        assert response.status_code == 400

    def test_chart_tiene_estructura_correcta(self, factory, db_setup):
        cliente = db_setup['cliente']

        request = factory.get(f'/api/reportes/clientes/{cliente.id}/', {'period': 'mes', 'date': '2025-03-01'})
        view = make_view()
        response = view(request, pk=cliente.id)

        assert response.status_code == 200
        assert len(response.data['chart']) == 31
        for entry in response.data['chart']:
            assert 'label' in entry
            assert 'billed' in entry
            assert 'paid' in entry

    def test_chart_anio_tiene_12_puntos(self, factory, db_setup):
        cliente = db_setup['cliente']

        request = factory.get(f'/api/reportes/clientes/{cliente.id}/', {'period': 'anio', 'date': '2025-06-15'})
        view = make_view()
        response = view(request, pk=cliente.id)

        assert response.status_code == 200
        assert len(response.data['chart']) == 12
