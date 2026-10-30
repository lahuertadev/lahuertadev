import pytest
from decimal import Decimal

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
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
    condicion_iva = TipoCondicionIva.objects.create(descripcion='RI')
    cliente = Cliente.objects.create(
        cuit='20123456789',
        razon_social='Cliente Test S.A.',
        cuenta_corriente=Decimal('10000.00'),
        telefono='1122334455',
        localidad=localidad,
        condicion_IVA=condicion_iva,
    )
    return {
        'cliente': cliente,
        'localidad': localidad,
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
    assert response.data[0]['razon_social'] == 'Cliente Test S.A.'


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
    assert response.data['razon_social'] == 'Nuevo Cliente S.R.L.'


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
    # Escrita distinto a la existente ('Cliente Test S.A.'): se normaliza y choca igual.
    payload = _base_payload(db_setup, razon_social='cliente TEST sa')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_campos_obligatorios_faltantes(factory):
    vs, _ = _make_viewset()
    response = vs.create(Request(factory.post('/client/', {}, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cuit' in response.data


@pytest.mark.django_db
def test_create_con_lista_de_precios(factory, db_setup):
    vs, _ = _make_viewset()
    price_list = ListaPrecios.objects.create(descripcion='Lista General')
    payload = _base_payload(db_setup, lista_precios=price_list.id)
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['lista_precios']['id'] == price_list.id


@pytest.mark.django_db
def test_create_sin_lista_de_precios(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, lista_precios=None)
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['lista_precios'] is None
    assert Cliente.objects.get(id=response.data['id']).lista_precios is None


@pytest.mark.django_db
def test_create_capitaliza_nombres_y_domicilio(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(
        db_setup,
        razon_social='comedor iGLESIA San Justo sa',
        nombre_fantasia='el COMEDOR de  san justo',
        domicilio='av. de mayo 301',
    )
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['razon_social'] == 'Comedor Iglesia San Justo S.A.'
    assert response.data['nombre_fantasia'] == 'El Comedor De San Justo'
    assert response.data['domicilio'] == 'Av. De Mayo 301'


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


@pytest.mark.django_db
def test_update_quita_lista_de_precios(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    client.lista_precios = ListaPrecios.objects.create(descripcion='Lista General')
    client.save()
    payload = _base_payload(db_setup, cuit=client.cuit, razon_social=client.razon_social, lista_precios=None)
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['lista_precios'] is None
    client.refresh_from_db()
    assert client.lista_precios is None


@pytest.mark.django_db
def test_update_asigna_lista_de_precios(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    price_list = ListaPrecios.objects.create(descripcion='Lista General')
    payload = _base_payload(db_setup, cuit=client.cuit, razon_social=client.razon_social, lista_precios=price_list.id)
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['lista_precios']['id'] == price_list.id


@pytest.mark.django_db
def test_update_capitaliza_razon_social(factory, db_setup):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    payload = _base_payload(db_setup, cuit=client.cuit, razon_social='verdulería LOS hermanos srl')
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['razon_social'] == 'Verdulería Los Hermanos S.R.L.'


# ── DIRECCIÓN DE ENTREGA ───────────────────────────────────────────────────────

class FakeDistrictService:
    def __init__(self, district):
        self.district = district
        self.received = []

    def create_or_get_district(self, district_data):
        self.received.append(district_data)
        return {'district': self.district} if self.district else None


@pytest.fixture
def delivery_district(db_setup):
    municipio = db_setup['localidad'].municipio
    return Localidad.objects.create(id='0642701010', nombre='Palermo', municipio=municipio)


def _set_delivery_address(client, district, address='Av. Corrientes 1234'):
    client.localidad_entrega = district
    client.domicilio_entrega = address
    client.save()


@pytest.mark.django_db
def test_create_sin_direccion_de_entrega(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup)
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['localidad_entrega'] is None
    assert response.data['domicilio_entrega'] is None


@pytest.mark.django_db
def test_create_con_direccion_de_entrega(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, localidad_entrega=delivery_district.id, domicilio_entrega='av. corrientes 1234')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['domicilio_entrega'] == 'Av. Corrientes 1234'
    assert response.data['localidad_entrega']['id'] == delivery_district.id
    assert response.data['localidad_entrega']['municipio']['provincia']['id'] == '06'
    client = Cliente.objects.get(id=response.data['id'])
    assert client.localidad_entrega == delivery_district


@pytest.mark.django_db
def test_create_direccion_de_entrega_en_null_y_vacia(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, localidad_entrega=None, domicilio_entrega='')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['domicilio_entrega'] is None


@pytest.mark.django_db
def test_create_localidad_de_entrega_sin_domicilio(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, localidad_entrega=delivery_district.id, domicilio_entrega='  ')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'domicilio_entrega' in response.data


@pytest.mark.django_db
def test_create_domicilio_de_entrega_sin_localidad(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _base_payload(db_setup, domicilio_entrega='Av. Corrientes 1234')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'localidad_entrega' in response.data


@pytest.mark.django_db
def test_create_resuelve_localidad_de_entrega_como_objeto(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    vs.district_service = FakeDistrictService(delivery_district)
    georef_district = {
        'id': delivery_district.id,
        'nombre': 'Palermo',
        'municipio': {'id': '064270', 'nombre': 'CABA', 'provincia': {'id': '06', 'nombre': 'Buenos Aires'}},
    }
    payload = _base_payload(db_setup, localidad_entrega=georef_district, domicilio_entrega='Av. Corrientes 1234')
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['localidad_entrega']['id'] == delivery_district.id
    assert vs.district_service.received == [georef_district]


@pytest.mark.django_db
def test_create_localidad_de_entrega_que_no_se_puede_procesar(factory, db_setup):
    vs, _ = _make_viewset()
    vs.district_service = FakeDistrictService(None)
    payload = _base_payload(
        db_setup,
        localidad_entrega={'id': '999', 'nombre': 'X', 'municipio': {'id': '1'}},
        domicilio_entrega='Av. Corrientes 1234',
    )
    response = vs.create(Request(factory.post('/client/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert response.data['detail'] == 'Error al procesar la localidad de entrega.'
    assert not Cliente.objects.filter(cuit=payload['cuit']).exists()


@pytest.mark.django_db
def test_retrieve_con_direccion_de_entrega(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    _set_delivery_address(client, delivery_district)
    response = vs.retrieve(
        Request(factory.get(f'/client/{client.id}/'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['domicilio_entrega'] == 'Av. Corrientes 1234'
    assert response.data['localidad_entrega']['nombre'] == 'Palermo'


@pytest.mark.django_db
def test_update_agrega_direccion_de_entrega(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    payload = _base_payload(
        db_setup,
        cuit=client.cuit,
        razon_social=client.razon_social,
        localidad_entrega=delivery_district.id,
        domicilio_entrega='Av. Corrientes 1234',
    )
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    client.refresh_from_db()
    assert client.localidad_entrega == delivery_district
    assert client.domicilio_entrega == 'Av. Corrientes 1234'


@pytest.mark.django_db
def test_update_quita_direccion_de_entrega(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    _set_delivery_address(client, delivery_district)
    payload = _base_payload(
        db_setup,
        cuit=client.cuit,
        razon_social=client.razon_social,
        localidad_entrega=None,
        domicilio_entrega=None,
    )
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['localidad_entrega'] is None
    client.refresh_from_db()
    assert client.localidad_entrega is None
    assert client.domicilio_entrega is None


@pytest.mark.django_db
def test_update_localidad_de_entrega_sin_domicilio(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    payload = _base_payload(db_setup, cuit=client.cuit, razon_social=client.razon_social, localidad_entrega=delivery_district.id)
    response = vs.update(
        Request(factory.put(f'/client/{client.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 400
    assert 'domicilio_entrega' in response.data
    client.refresh_from_db()
    assert client.localidad_entrega is None


@pytest.mark.django_db
def test_partial_update_cambia_solo_domicilio_de_entrega(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    _set_delivery_address(client, delivery_district)
    response = vs.partial_update(
        Request(factory.patch(f'/client/{client.id}/', {'domicilio_entrega': 'Thames 500'}, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    assert response.data['domicilio_entrega'] == 'Thames 500'
    assert response.data['localidad_entrega']['id'] == delivery_district.id


@pytest.mark.django_db
def test_partial_update_localidad_de_entrega_sin_domicilio(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    response = vs.partial_update(
        Request(factory.patch(f'/client/{client.id}/', {'localidad_entrega': delivery_district.id}, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 400
    assert 'domicilio_entrega' in response.data


@pytest.mark.django_db
def test_partial_update_sin_tocar_entrega_no_la_exige(factory, db_setup, delivery_district):
    vs, _ = _make_viewset()
    client = db_setup['cliente']
    _set_delivery_address(client, delivery_district)
    response = vs.partial_update(
        Request(factory.patch(f'/client/{client.id}/', {'telefono': '9988776655'}, format='json'), parsers=[JSONParser()]),
        pk=client.id,
    )
    assert response.status_code == 200
    client.refresh_from_db()
    assert client.localidad_entrega == delivery_district


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
