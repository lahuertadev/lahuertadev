import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from pago_compra.models import PagoCompra
from pago_compra.views import PurchasePaymentViewSet
from pago_compra.repositories import PurchasePaymentRepository
from pago_compra.exceptions import (
    PurchasePaymentNotFoundException,
    PaymentSupplierMismatchException,
    OwnCheckOtherSupplierException,
    PaymentExceedsBalanceException,
    PaymentEditBlockedException,
)
from pago_compra.service import OwnCheckInsufficientBalanceException
from cheque.exceptions import CheckNotFoundException, CheckAlreadyEndorsedException, CheckInvalidStateException
from core.tests.factories import make_payment_type, make_purchase, make_purchase_payment, make_supplier


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def db_setup(db):
    proveedor = make_supplier(nombre='Proveedor Test', puesto=1)
    compra = make_purchase(importe=Decimal('10000.00'), proveedor=proveedor)
    other_supplier = make_supplier(nombre='Otro Proveedor')
    tipo_pago = make_payment_type(descripcion='Efectivo')
    return {'compra': compra, 'proveedor': proveedor, 'other_supplier': other_supplier, 'tipo_pago': tipo_pago}


# ── Fake repo ──────────────────────────────────────────────────────────────────

class FakePurchasePaymentRepo(PurchasePaymentRepository):
    '''Repository real (base de test) con un helper para cargar pagos.'''

    def _add_real(self, compra, tipo_pago, importe=Decimal('1000.00'), proveedor=None):
        return make_purchase_payment(
            proveedor=proveedor or compra.proveedor,
            compra=compra,
            importe_abonado=importe,
            tipo_pago=tipo_pago,
            fecha_pago='2024-01-01',
        )


# ── Fake service ───────────────────────────────────────────────────────────────

class FakePurchasePaymentService:
    def __init__(self, repo):
        self._repo = repo

    def create_payment(self, data):
        return self._repo.create(
            proveedor=data['proveedor'],
            compra=data.get('compra'),
            importe_abonado=data['importe_abonado'],
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )

    def update_payment(self, payment_id, data):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')
        return self._repo.update(payment, data)

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
        'proveedor': db_setup['proveedor'].id,
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
    assert 'proveedor' in response.data
    # La compra es opcional: sin compra el pago es a cuenta.
    assert 'compra' not in response.data


@pytest.mark.django_db
def test_create_tipo_cheque_sin_numero_retorna_400(factory, db_setup):
    tipo_cheque = make_payment_type(descripcion='Cheque')
    vs, _ = _make_viewset()
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cheque_id' in str(response.data)


@pytest.mark.django_db
def test_create_cheque_no_encontrado_retorna_404(factory, db_setup):
    tipo_cheque = make_payment_type(descripcion='Cheque')

    class ServiceCheckNotFound:
        def create_payment(self, data):
            raise CheckNotFoundException('Cheque no encontrado.')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceCheckNotFound())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_id': 99999,
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_create_cheque_ya_endosado_retorna_400(factory, db_setup):
    tipo_cheque = make_payment_type(descripcion='Cheque')

    class ServiceAlreadyEndorsed:
        def create_payment(self, data):
            raise CheckAlreadyEndorsedException('El cheque ya fue endosado.')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceAlreadyEndorsed())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_id': 12345,
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'endosado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_create_cheque_estado_invalido_retorna_400(factory, db_setup):
    tipo_cheque = make_payment_type(descripcion='Cheque')

    class ServiceInvalidState:
        def create_payment(self, data):
            raise CheckInvalidStateException('Solo se pueden endosar cheques en estado EN_CARTERA.')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceInvalidState())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compra': db_setup['compra'].id,
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_id': 12345,
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
        'proveedor': db_setup['proveedor'].id,
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


# ── PAGO A CUENTA (DEV-141) ────────────────────────────────────────────────────

def _on_account_payload(db_setup, **extra):
    return {
        'proveedor': db_setup['proveedor'].id,
        'importe_abonado': '1000000.00',
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
        **extra,
    }


@pytest.mark.django_db
def test_create_pago_a_cuenta_sin_compra(factory, db_setup):
    vs, _ = _make_viewset()

    response = vs.create(Request(factory.post('/purchase-payment/', _on_account_payload(db_setup), format='json'), parsers=[JSONParser()]))

    assert response.status_code == 201
    assert response.data['compra'] is None
    assert response.data['proveedor'] == {
        'id': db_setup['proveedor'].id, 'nombre': 'Proveedor Test', 'puesto': 1,
    }


@pytest.mark.django_db
def test_create_pago_a_cuenta_con_compra_null(factory, db_setup):
    vs, _ = _make_viewset()

    response = vs.create(Request(
        factory.post('/purchase-payment/', _on_account_payload(db_setup, compra=None), format='json'),
        parsers=[JSONParser()],
    ))

    assert response.status_code == 201
    assert response.data['compra'] is None


@pytest.mark.django_db
def test_retrieve_pago_de_compra_expone_proveedor_y_compra(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = vs.retrieve(Request(factory.get(f'/purchase-payment/{payment.id}/'), parsers=[JSONParser()]), pk=payment.id)

    assert response.data['proveedor']['nombre'] == 'Proveedor Test'
    assert response.data['compra']['id'] == db_setup['compra'].id


@pytest.mark.django_db
def test_list_filtra_por_proveedor(factory, db_setup):
    vs, repo = _make_viewset()
    repo._add_real(db_setup['compra'], db_setup['tipo_pago'])
    make_purchase_payment(
        proveedor=db_setup['other_supplier'], compra=None, importe_abonado=Decimal('500.00'),
        tipo_pago=db_setup['tipo_pago'], fecha_pago='2024-01-02',
    )

    response = vs.list(Request(
        factory.get('/purchase-payment/', {'supplier_id': db_setup['other_supplier'].id}),
        parsers=[JSONParser()],
    ))

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['compra'] is None
    assert response.data[0]['proveedor']['nombre'] == 'Otro Proveedor'


@pytest.mark.django_db
@pytest.mark.parametrize('exception, message', [
    (PaymentSupplierMismatchException, 'La compra seleccionada no corresponde al proveedor del pago.'),
    (OwnCheckOtherSupplierException, 'El cheque N° 900 ya se usó para pagarle a otro proveedor.'),
])
def test_create_reglas_de_proveedor_retornan_400(factory, db_setup, exception, message):
    class ServiceRaises:
        def create_payment(self, data):
            raise exception(message)
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceRaises())

    response = vs.create(Request(factory.post('/purchase-payment/', _on_account_payload(db_setup), format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert response.data['detail'] == message


@pytest.mark.django_db
def test_create_error_inesperado_retorna_500_generico(factory, db_setup):
    class ServiceBroken:
        def create_payment(self, data):
            raise RuntimeError('detalle interno')
        def delete_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceBroken())

    response = vs.create(Request(factory.post('/purchase-payment/', _on_account_payload(db_setup), format='json'), parsers=[JSONParser()]))

    assert response.status_code == 500
    assert response.data['detail'] == 'Error al registrar el pago.'



# ── UPDATE ─────────────────────────────────────────────────────────────────────

def _put(factory, vs, pk, payload):
    return vs.update(Request(factory.put(f'/purchase-payment/{pk}/', payload, format='json'), parsers=[JSONParser()]), pk=pk)


@pytest.mark.django_db
def test_update_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = _put(factory, vs, payment.id, {'importe_abonado': '2500.00', 'fecha_pago': '2024-02-10'})

    assert response.status_code == 200
    assert response.data['importe_abonado'] == '2500.00'
    assert response.data['fecha_pago'] == '2024-02-10'
    payment.refresh_from_db()
    assert payment.importe_abonado == Decimal('2500.00')


@pytest.mark.django_db
def test_update_campos_obligatorios_retorna_400(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = _put(factory, vs, payment.id, {})

    assert response.status_code == 400
    assert 'importe_abonado' in response.data
    assert 'fecha_pago' in response.data


@pytest.mark.django_db
def test_update_importe_cero_retorna_400(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = _put(factory, vs, payment.id, {'importe_abonado': '0', 'fecha_pago': '2024-02-10'})

    assert response.status_code == 400
    assert 'importe_abonado' in response.data


@pytest.mark.django_db
def test_update_not_found(factory):
    vs, _ = _make_viewset()

    response = _put(factory, vs, 999, {'importe_abonado': '100.00', 'fecha_pago': '2024-02-10'})

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
@pytest.mark.parametrize('exception, message', [
    (PaymentExceedsBalanceException, 'El importe abonado (9999.00) supera el saldo pendiente (1000.00).'),
    (OwnCheckInsufficientBalanceException, 'El importe abonado (9999.00) supera el saldo restante del cheque (500.00).'),
    (PaymentEditBlockedException, 'No se puede cambiar el importe: el cheque con el que se pagó fue rechazado.'),
])
def test_update_reglas_de_negocio_retornan_400(factory, exception, message):
    class ServiceRaises:
        def update_payment(self, payment_id, data):
            raise exception(message)

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceRaises())

    response = _put(factory, vs, 1, {'importe_abonado': '9999.00', 'fecha_pago': '2024-02-10'})

    assert response.status_code == 400
    assert response.data['detail'] == message


@pytest.mark.django_db
def test_update_error_inesperado_retorna_500_generico(factory):
    class ServiceBroken:
        def update_payment(self, payment_id, data):
            raise RuntimeError('detalle interno')

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceBroken())

    response = _put(factory, vs, 1, {'importe_abonado': '100.00', 'fecha_pago': '2024-02-10'})

    assert response.status_code == 500
    assert response.data['detail'] == 'Error al editar el pago.'
