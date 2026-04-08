import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_pago.models import TipoPago
from cliente.models import Cliente
from pago_cliente.models import PagoCliente
from pago_cliente.views import ClientPaymentViewSet
from pago_cliente.interfaces import IClientPaymentRepository
from pago_cliente.exceptions import ClientPaymentNotFoundException, PaymentTypeChangeBlockedException


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
    tipo_pago = TipoPago.objects.create(descripcion='Efectivo')
    cliente = Cliente.objects.create(
        cuit='20123456789',
        razon_social='Cliente Test SA',
        cuenta_corriente=Decimal('10000.00'),
        telefono='1122334455',
        localidad=localidad,
        tipo_facturacion=tipo_fact,
        condicion_IVA=condicion_iva,
    )
    return {'cliente': cliente, 'tipo_pago': tipo_pago}


# ── Fake repo ──────────────────────────────────────────────────────────────────

class FakeClientPaymentRepo(IClientPaymentRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1

    def _add_real(self, cliente, tipo_pago, importe=Decimal('1000.00')):
        '''Usa objetos reales de Django para que el serializer los serialice correctamente.'''
        payment = PagoCliente.objects.create(
            cliente=cliente,
            tipo_pago=tipo_pago,
            fecha_pago='2024-01-01',
            importe=importe,
        )
        self._items[payment.id] = payment
        return payment

    def get_all(self, client_id=None):
        qs = PagoCliente.objects.select_related('cliente', 'tipo_pago').all()
        if client_id:
            qs = qs.filter(cliente_id=client_id)
        return qs

    def get_by_id(self, id):
        return PagoCliente.objects.select_related('cliente', 'tipo_pago').filter(id=id).first()

    def create(self, client, payment_type, payment_date, amount, observations=None):
        payment = PagoCliente.objects.create(
            cliente=client,
            tipo_pago=payment_type,
            fecha_pago=payment_date,
            importe=amount,
            observaciones=observations,
        )
        return payment

    def update(self, payment, data):
        for k, v in data.items():
            setattr(payment, k, v)
        payment.save()
        return payment

    def save(self, payment):
        payment.save()
        return payment

    def delete(self, payment):
        payment.delete()


# ── Fake service ───────────────────────────────────────────────────────────────

class FakeClientPaymentService:
    def __init__(self, repo):
        self._repo = repo

    def create_payment(self, data):
        return self._repo.create(
            client=data['cliente'],
            payment_type=data['tipo_pago'],
            payment_date=data['fecha_pago'],
            amount=data['importe'],
            observations=data.get('observaciones'),
        )

    def update_payment(self, payment_id, data):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')
        return self._repo.update(payment, data)

    def delete_payment(self, payment_id):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')
        self._repo.delete(payment)


def _make_viewset():
    repo = FakeClientPaymentRepo()
    svc = FakeClientPaymentService(repo)
    return ClientPaymentViewSet(repository=repo, service=svc), repo


# ── LIST ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_empty(factory):
    vs, _ = _make_viewset()
    request = factory.get('/client-payment/')
    response = vs.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_list_with_items(factory, db_setup):
    vs, repo = _make_viewset()
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])

    response = vs.list(Request(factory.get('/client-payment/'), parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 2


@pytest.mark.django_db
def test_list_filter_by_client_id(factory, db_setup):
    otro_cliente = Cliente.objects.create(
        cuit='27987654321',
        razon_social='Otro SRL',
        cuenta_corriente=Decimal('0.00'),
        telefono='9988776655',
        localidad=db_setup['cliente'].localidad,
        tipo_facturacion=db_setup['cliente'].tipo_facturacion,
        condicion_IVA=db_setup['cliente'].condicion_IVA,
    )
    vs, repo = _make_viewset()
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    repo._add_real(otro_cliente, db_setup['tipo_pago'])

    request = factory.get('/client-payment/', {'client_id': db_setup['cliente'].id})
    response = vs.list(Request(request, parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['cliente']['id'] == db_setup['cliente'].id


# ── RETRIEVE ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.retrieve(Request(factory.get('/client-payment/999/'), parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_retrieve_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])

    response = vs.retrieve(
        Request(factory.get(f'/client-payment/{payment.id}/'), parsers=[JSONParser()]),
        pk=payment.id,
    )

    assert response.status_code == 200
    assert response.data['id'] == payment.id


# ── CREATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_success(factory, db_setup):
    vs, _ = _make_viewset()
    payload = {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
        'importe': '1500.00',
    }
    response = vs.create(Request(factory.post('/client-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['id'] is not None


@pytest.mark.django_db
def test_create_missing_required_fields(factory):
    vs, _ = _make_viewset()
    response = vs.create(Request(factory.post('/client-payment/', {}, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cliente' in response.data


# ── UPDATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_not_found(factory, db_setup):
    vs, _ = _make_viewset()
    payload = {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
        'importe': '1000.00',
    }
    response = vs.update(
        Request(factory.put('/client-payment/999/', payload, format='json'), parsers=[JSONParser()]),
        pk=999,
    )
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_update_bloquea_si_cheque_endosado(factory, db_setup):
    class ServiceQueBloquea:
        def create_payment(self, data): pass
        def update_payment(self, payment_id, data):
            raise PaymentTypeChangeBlockedException(
                'No se puede cambiar el tipo de pago porque el cheque asociado ya fue endosado.'
            )
        def delete_payment(self, payment_id): pass

    repo = FakeClientPaymentRepo()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    vs = ClientPaymentViewSet(repository=repo, service=ServiceQueBloquea())

    tipo_efectivo = TipoPago.objects.create(descripcion='Transferencia')
    payload = {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': tipo_efectivo.id,
        'fecha_pago': '2024-01-15',
        'importe': '1000.00',
    }
    response = vs.update(
        Request(factory.put(f'/client-payment/{payment.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=payment.id,
    )
    assert response.status_code == 400
    assert 'endosado' in response.data['detail'].lower()


# ── DESTROY ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_destroy_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.destroy(Request(factory.delete('/client-payment/999/'), parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_destroy_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    payment_id = payment.id

    response = vs.destroy(
        Request(factory.delete(f'/client-payment/{payment_id}/'), parsers=[JSONParser()]),
        pk=payment_id,
    )

    assert response.status_code == 204
    assert PagoCliente.objects.filter(id=payment_id).count() == 0
