import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from mercado.models import Mercado
from proveedor.models import Proveedor
from compra.models import Compra
from tipo_pago.models import TipoPago
from pago_compra.models import PagoCompra
from pago_compra.views import PurchasePaymentViewSet
from pago_compra.interfaces import IPurchasePaymentRepository
from pago_compra.exceptions import PurchasePaymentNotFoundException
from cheque.exceptions import CheckNotFoundException, CheckAlreadyEndorsedException, CheckInvalidStateException


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def db_setup(db):
    mercado = Mercado.objects.create(descripcion='Mercado Central')
    proveedor = Proveedor.objects.create(
        nombre='Proveedor Test',
        puesto=1,
        telefono='1234567890',
        cuenta_corriente=Decimal('0.00'),
        nombre_fantasia='PT',
        mercado=mercado,
    )
    compra = Compra.objects.create(
        fecha='2024-01-01',
        importe=Decimal('10000.00'),
        senia=Decimal('0.00'),
        proveedor=proveedor,
    )
    tipo_pago = TipoPago.objects.create(descripcion='Efectivo')
    return {'compra': compra, 'tipo_pago': tipo_pago}


# ── Fake repo ──────────────────────────────────────────────────────────────────

class FakePurchasePaymentRepo(IPurchasePaymentRepository):
    def __init__(self):
        self._items = {}

    def _add_real(self, compra, tipo_pago, importe=Decimal('1000.00')):
        payment = PagoCompra.objects.create(
            compra=compra,
            importe_abonado=importe,
            tipo_pago=tipo_pago,
            fecha_pago='2024-01-01',
        )
        self._items[payment.id] = payment
        return payment

    def get_all(self, compra_id=None):
        qs = (
            PagoCompra.objects
            .select_related('compra__proveedor', 'tipo_pago')
            .prefetch_related('cheque_set__banco', 'cheque_set__estado')
            .all()
        )
        if compra_id:
            qs = qs.filter(compra_id=compra_id)
        return qs

    def get_by_id(self, id):
        return (
            PagoCompra.objects
            .select_related('compra__proveedor', 'tipo_pago')
            .prefetch_related('cheque_set__banco', 'cheque_set__estado')
            .filter(id=id)
            .first()
        )

    def create(self, compra, importe_abonado, tipo_pago, fecha_pago):
        return PagoCompra.objects.create(
            compra=compra,
            importe_abonado=importe_abonado,
            tipo_pago=tipo_pago,
            fecha_pago=fecha_pago,
        )

    def delete(self, payment):
        payment.delete()


# ── Fake service ───────────────────────────────────────────────────────────────

class FakePurchasePaymentService:
    def __init__(self, repo):
        self._repo = repo

    def create_payment(self, data):
        return self._repo.create(
            compra=data['compra'],
            importe_abonado=data['importe_abonado'],
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )

    def delete_payment(self, payment_id):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')
        self._repo.delete(payment)


def _make_viewset():
    repo = FakePurchasePaymentRepo()
    svc = FakePurchasePaymentService(repo)
    return PurchasePaymentViewSet(repository=repo, service=svc), repo


# ── LIST ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_empty(factory):
    vs, _ = _make_viewset()
    response = vs.list(Request(factory.get('/purchase-payment/'), parsers=[JSONParser()]))
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_list_with_items(factory, db_setup):
    vs, repo = _make_viewset()
    repo._add_real(db_setup['compra'], db_setup['tipo_pago'])
    repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = vs.list(Request(factory.get('/purchase-payment/'), parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 2


# ── RETRIEVE ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.retrieve(
        Request(factory.get('/purchase-payment/999/'), parsers=[JSONParser()]),
        pk=999,
    )
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_retrieve_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = vs.retrieve(
        Request(factory.get(f'/purchase-payment/{payment.id}/'), parsers=[JSONParser()]),
        pk=payment.id,
    )

    assert response.status_code == 200
    assert response.data['id'] == payment.id


# ── CREATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_success(factory, db_setup):
    vs, _ = _make_viewset()
    payload = {
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['id'] is not None


@pytest.mark.django_db
def test_create_missing_required_fields(factory):
    vs, _ = _make_viewset()
    response = vs.create(Request(factory.post('/purchase-payment/', {}, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'compra' in response.data


@pytest.mark.django_db
def test_create_tipo_cheque_sin_numero_retorna_400(factory, db_setup):
    tipo_cheque = TipoPago.objects.create(descripcion='Cheque')
    vs, _ = _make_viewset()
    payload = {
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cheque_numero' in str(response.data)


@pytest.mark.django_db
def test_create_cheque_no_encontrado_retorna_404(factory, db_setup):
    tipo_cheque = TipoPago.objects.create(descripcion='Cheque')

    class ServiceCheckNotFound:
        def create_payment(self, data):
            raise CheckNotFoundException('Cheque no encontrado.')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceCheckNotFound())
    payload = {
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_numero': 99999,
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_create_cheque_ya_endosado_retorna_400(factory, db_setup):
    tipo_cheque = TipoPago.objects.create(descripcion='Cheque')

    class ServiceAlreadyEndorsed:
        def create_payment(self, data):
            raise CheckAlreadyEndorsedException('El cheque ya fue endosado.')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceAlreadyEndorsed())
    payload = {
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_numero': 12345,
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'endosado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_create_cheque_estado_invalido_retorna_400(factory, db_setup):
    tipo_cheque = TipoPago.objects.create(descripcion='Cheque')

    class ServiceInvalidState:
        def create_payment(self, data):
            raise CheckInvalidStateException('Solo se pueden endosar cheques en estado EN_CARTERA.')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceInvalidState())
    payload = {
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_numero': 12345,
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'en_cartera' in response.data['detail'].lower()


# ── DESTROY ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_destroy_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.destroy(
        Request(factory.delete('/purchase-payment/999/'), parsers=[JSONParser()]),
        pk=999,
    )
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_create_payment_exceeds_balance_returns_400(factory, db_setup):
    from pago_compra.exceptions import PaymentExceedsBalanceException

    class ServiceExceedsBalance:
        def create_payment(self, data):
            raise PaymentExceedsBalanceException(
                'El importe abonado supera el saldo pendiente.'
            )
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceExceedsBalance())
    payload = {
        'compra': db_setup['compra'].id,
        'importe_abonado': '99999.00',
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'saldo pendiente' in response.data['detail'].lower()


@pytest.mark.django_db
def test_destroy_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])
    payment_id = payment.id

    response = vs.destroy(
        Request(factory.delete(f'/purchase-payment/{payment_id}/'), parsers=[JSONParser()]),
        pk=payment_id,
    )

    assert response.status_code == 204
    assert PagoCompra.objects.filter(id=payment_id).count() == 0
