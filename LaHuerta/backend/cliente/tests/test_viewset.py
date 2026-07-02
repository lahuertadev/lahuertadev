import pytest
from decimal import Decimal

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from lista_precios.models import ListaPrecios
from cliente.models import Cliente
from cliente.views import ClientViewSet
from cliente.interfaces import IClientRepository
from cliente.exceptions import ClientNotFoundException
from factura.models import Factura
from tipo_factura.models import TipoFactura
from pago_cliente.models import PagoCliente
from tipo_pago.models import TipoPago


# ── Fixtures DB ────────────────────────────────────────────────────────────────

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
    cliente = Cliente.objects.create(
        cuit='20123456789',
        razon_social='Cliente Test SA',
        cuenta_corriente=Decimal('10000.00'),
        telefono='1122334455',
        localidad=localidad,
        tipo_facturacion=tipo_fact,
        condicion_IVA=condicion_iva,
    )
    return {
        'cliente': cliente,
        'localidad': localidad,
        'tipo_fact': tipo_fact,
        'condicion_iva': condicion_iva,
    }


# ── Fake repo ──────────────────────────────────────────────────────────────────

class FakeClientRepo(IClientRepository):
    def __init__(self):
        self._items = {}

    def _add(self, client):
        self._items[client.id] = client
        return client

    def get_all_clients(self, cuit=None, searchQuery=None, address=None):
        return Cliente.objects.all()

    def get_client_by_id(self, id):
        return Cliente.objects.filter(id=id).first()

    def get_client_by_cuit(self, cuit):
        return Cliente.objects.filter(cuit=cuit).first()

    def create_client(self, data):
        client = Cliente(**data)
        client.save()
        return client

    def modify_client(self, client, data):
        for key, value in data.items():
            setattr(client, key, value)
        client.save()
        return client

    def delete_client(self, client):
        client.delete()

    def update_balance(self, client):
        client.save(update_fields=['cuenta_corriente'])
        return client


def _make_viewset():
    repo = FakeClientRepo()
    return ClientViewSet(repository=repo), repo


def _base_payload(db_setup, **overrides):
    payload = {
        'cuit': '20999888777',
        'razon_social': 'Nuevo Cliente SRL',
        'cuenta_corriente': '0.00',
        'telefono': '1133445566',
        'localidad': db_setup['localidad'].id,
        'tipo_facturacion': db_setup['tipo_fact'].id,
        'condicion_IVA': db_setup['condicion_iva'].id,
        'fecha_inicio_ventas': '2024-01-01',
        'estado': True,
    }
    payload.update(overrides)
    return payload


# ── LIST ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_empty(factory):
    vs, _ = _make_viewset()
    response = vs.list(Request(factory.get('/client/'), parsers=[JSONParser()]))
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_list_returns_clients(factory, db_setup):
    vs, _ = _make_viewset()
    response = vs.list(Request(factory.get('/client/'), parsers=[JSONParser()]))
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['razon_social'] == 'Cliente Test SA'


@pytest.mark.django_db
def test_list_filter_by_cuit(factory, db_setup):
    vs, _ = _make_viewset()
    request = factory.get('/client/', {'cuit': '20123456789'})
    response = vs.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
def test_list_filter_by_search_query(factory, db_setup):
    vs, _ = _make_viewset()
    request = factory.get('/client/', {'searchQuery': 'Test SA'})
    response = vs.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 200
    assert len(response.data) == 1


# ── RETRIEVE ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_success(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    response = vs.retrieve(
        Request(factory.get(f'/client/{client.id}/'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['id'] == client.id
    assert response.data['cuenta_corriente'] == '10000.00'


@pytest.mark.django_db
def test_retrieve_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.retrieve(
        Request(factory.get('/client/9999/'), parsers=[JSONParser()]),
        pk=9999,
    )
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


# ── CREATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_success(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup)
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['razon_social'] == 'Nuevo Cliente SRL'


@pytest.mark.django_db
def test_create_con_saldo_inicial(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, cuenta_corriente='500000.00')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['cuenta_corriente'] == '500000.00'


@pytest.mark.django_db
def test_create_con_saldo_inicial_negativo(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, cuenta_corriente='-500000.00')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['cuenta_corriente'] == '-500000.00'


@pytest.mark.django_db
def test_create_cuit_duplicado(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, cuit='20123456789')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_razon_social_duplicada(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, razon_social='Cliente Test SA')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_campos_obligatorios_faltantes(factory):
    vs, _ = _make_viewset()
    response = vs.create(Request(factory.post('/client/', {}, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cuit' in response.data


# ── UPDATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_success(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    payload = _base_payload(db_setup, cuit=client.cuit, razon_social='Nombre Actualizado')
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['razon_social'] == 'Nombre Actualizado'


@pytest.mark.django_db
def test_update_cuenta_corriente(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    payload = _base_payload(db_setup, cuit=client.cuit, razon_social=client.razon_social, cuenta_corriente='99999.99')
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['cuenta_corriente'] == '99999.99'


@pytest.mark.django_db
def test_update_not_found(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup)
    response = vs.update(
        Request(factory.put('/client/9999/', payload, format='json'), parsers=[JSONParser()]),
        pk=9999,
    )
    assert response.status_code == 404


# ── PARTIAL UPDATE ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_partial_update_solo_telefono(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    response = vs.partial_update(
        Request(factory.patch(f'/client/{client.id}/', {'telefono': '9988776655'}, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['telefono'] == '9988776655'


@pytest.mark.django_db
def test_partial_update_cuenta_corriente(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    response = vs.partial_update(
        Request(factory.patch(f'/client/{client.id}/', {'cuenta_corriente': '250000.00'}, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['cuenta_corriente'] == '250000.00'


@pytest.mark.django_db
def test_partial_update_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.partial_update(
        Request(factory.patch('/client/9999/', {'telefono': '111'}, format='json'), parsers=[JSONParser()]),
        pk=9999,
    )
    assert response.status_code == 404


# ── DESTROY ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_destroy_success(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    client_id = client.id
    response = vs.destroy(
        Request(factory.delete(f'/client/{client_id}/'), parsers=[JSONParser()]),
        pk=client_id,
    )
    assert response.status_code == 204
    assert Cliente.objects.filter(id=client_id).count() == 0


@pytest.mark.django_db
def test_destroy_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.destroy(
        Request(factory.delete('/client/9999/'), parsers=[JSONParser()]),
        pk=9999,
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_destroy_bloqueado_con_factura(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    tipo_factura = TipoFactura.objects.create(descripcion='Factura A', abreviatura='FA')
    Factura.objects.create(
        fecha='2026-01-01',
        subtotal=Decimal('1000.00'),
        tipo_factura=tipo_factura,
        cliente=client,
    )
    response = vs.destroy(
        Request(factory.delete(f'/client/{client.id}/'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 400
    assert 'facturas o pagos' in response.data['detail']
    assert Cliente.objects.filter(id=client.id).exists()


@pytest.mark.django_db
def test_destroy_bloqueado_con_pago(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    tipo_pago = TipoPago.objects.create(descripcion='Efectivo')
    PagoCliente.objects.create(
        fecha_pago='2026-01-01',
        importe=Decimal('500.00'),
        cliente=client,
        tipo_pago=tipo_pago,
    )
    response = vs.destroy(
        Request(factory.delete(f'/client/{client.id}/'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 400
    assert 'facturas o pagos' in response.data['detail']
    assert Cliente.objects.filter(id=client.id).exists()
