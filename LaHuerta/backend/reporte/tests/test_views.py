import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory, force_authenticate

from autenticacion.models import Usuario
from reporte.views import ClientReportViewSet
from reporte.exceptions import ClientNotFoundException
from core.tests.factories import make_bill, make_bill_type, make_client, make_client_payment, make_payment_type, make_user


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def authenticated_user(db):
    return make_user(role=Usuario.ADMINISTRATOR)


@pytest.fixture
def db_setup(db):
    tipo_factura = make_bill_type(descripcion='A')
    tipo_pago = make_payment_type(descripcion='Efectivo')

    cliente = make_client(razon_social='Cliente Test SA')
    return {
        'cliente': cliente,
        'tipo_factura': tipo_factura,
        'tipo_pago': tipo_pago,
    }


def make_view():
    return ClientReportViewSet.as_view({'get': 'retrieve'})


class TestClientReportViewSet:
    def test_reporte_exitoso(self, factory, db_setup, authenticated_user):
        cliente = db_setup['cliente']
        tipo_factura = db_setup['tipo_factura']
        tipo_pago = db_setup['tipo_pago']

        make_bill(cliente=cliente, tipo_factura=tipo_factura, fecha=date(2025, 3, 10), total=Decimal('1000'))
        make_client_payment(cliente=cliente, tipo_pago=tipo_pago, fecha_pago=date(2025, 3, 15), importe=Decimal('600'))

        request = factory.get(f'/api/reportes/clientes/{cliente.id}/', {'period': 'mes', 'date': '2025-03-01'})
        force_authenticate(request, user=authenticated_user)
        view = make_view()
        response = view(request, pk=cliente.id)

        assert response.status_code == 200
        assert response.data['kpis']['total_billed'] == '1000.00'
        assert response.data['kpis']['total_paid'] == '600.00'
        assert response.data['kpis']['pending_balance'] == '400.00'
        assert response.data['period'] == 'mes'
        assert len(response.data['bills']) == 1
        assert len(response.data['payments']) == 1

    def test_cliente_no_encontrado_retorna_404(self, factory, authenticated_user):
        service = Mock()
        service.get_client_report.side_effect = ClientNotFoundException('Cliente no encontrado.')

        request = factory.get('/api/reportes/clientes/999/', {'period': 'mes', 'date': '2025-03-01'})
        force_authenticate(request, user=authenticated_user)
        view = ClientReportViewSet.as_view({'get': 'retrieve'}, service=service)
        response = view(request, pk=999)

        assert response.status_code == 404
        assert 'no encontrado' in response.data['detail'].lower()

    def test_period_invalido_retorna_400(self, factory, authenticated_user):
        request = factory.get('/api/reportes/clientes/1/', {'period': 'bimestre', 'date': '2025-03-01'})
        force_authenticate(request, user=authenticated_user)
        view = make_view()
        response = view(request, pk=1)

        assert response.status_code == 400

    def test_date_invalida_retorna_400(self, factory, authenticated_user):
        request = factory.get('/api/reportes/clientes/1/', {'period': 'mes', 'date': 'no-es-fecha'})
        force_authenticate(request, user=authenticated_user)
        view = make_view()
        response = view(request, pk=1)

        assert response.status_code == 400

    def test_sin_params_retorna_400(self, factory, authenticated_user):
        request = factory.get('/api/reportes/clientes/1/')
        force_authenticate(request, user=authenticated_user)
        view = make_view()
        response = view(request, pk=1)

        assert response.status_code == 400

    def test_chart_tiene_estructura_correcta(self, factory, db_setup, authenticated_user):
        cliente = db_setup['cliente']

        request = factory.get(f'/api/reportes/clientes/{cliente.id}/', {'period': 'mes', 'date': '2025-03-01'})
        force_authenticate(request, user=authenticated_user)
        view = make_view()
        response = view(request, pk=cliente.id)

        assert response.status_code == 200
        assert len(response.data['chart']) == 31
        for entry in response.data['chart']:
            assert 'label' in entry
            assert 'billed' in entry
            assert 'paid' in entry

    def test_chart_anio_tiene_12_puntos(self, factory, db_setup, authenticated_user):
        cliente = db_setup['cliente']

        request = factory.get(f'/api/reportes/clientes/{cliente.id}/', {'period': 'anio', 'date': '2025-06-15'})
        force_authenticate(request, user=authenticated_user)
        view = make_view()
        response = view(request, pk=cliente.id)

        assert response.status_code == 200
        assert len(response.data['chart']) == 12
