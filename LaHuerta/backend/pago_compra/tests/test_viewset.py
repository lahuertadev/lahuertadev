import datetime
import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from pago_compra.models import PagoCompra
from pago_compra.views import PurchasePaymentViewSet
from pago_compra.repositories import PurchasePaymentRepository
from pago_compra.exceptions import (
    PurchasePaymentNotFoundException,
    PaymentSupplierMismatchException,
    OwnCheckNotAvailableException,
    PaymentExceedsBalanceException,
    PaymentEditBlockedException,
    PaymentApplicationsExceedAmountException,
)
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
        payment = self._repo.create(
            proveedor=data['proveedor'],
            importe_abonado=data['importe_abonado'],
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )
        self._repo.replace_purchase_applications(
            payment, [(item['compra'], item['importe']) for item in data.get('compras', [])],
        )
        return payment

    def update_payment(self, payment_id, data):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')
        if 'compras' in data:
            self._repo.replace_purchase_applications(
                payment, [(item['compra'], item['importe']) for item in data['compras']],
            )
        return self._repo.update(payment, {field: value for field, value in data.items() if field != 'compras'})

    def cancel_payment(self, payment_id):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')
        return self._repo.update(payment, {'estado_pago': 'ANULADO', 'fecha_anulacion': datetime.date(2026, 11, 13)})


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
        'compras': [{'compra': db_setup['compra'].id, 'importe': '1500.00'}],
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
    # Las compras son opcionales: sin compras el pago es a cuenta.
    assert 'compras' not in response.data


@pytest.mark.django_db
def test_create_tipo_cheque_sin_numero_retorna_400(factory, db_setup):
    tipo_cheque = make_payment_type(descripcion='Cheque')
    vs, _ = _make_viewset()
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compras': [{'compra': db_setup['compra'].id, 'importe': '1500.00'}],
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cheque_ids' in response.data


@pytest.mark.django_db
def test_create_cheque_no_encontrado_retorna_404(factory, db_setup):
    tipo_cheque = make_payment_type(descripcion='Cheque')

    class ServiceCheckNotFound:
        def create_payment(self, data):
            raise CheckNotFoundException('Cheque no encontrado.')
        def cancel_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceCheckNotFound())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compras': [{'compra': db_setup['compra'].id, 'importe': '1500.00'}],
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_ids': [99999],
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
        def cancel_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceAlreadyEndorsed())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compras': [{'compra': db_setup['compra'].id, 'importe': '1500.00'}],
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_ids': [12345],
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
        def cancel_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceInvalidState())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compras': [{'compra': db_setup['compra'].id, 'importe': '1500.00'}],
        'importe_abonado': '1500.00',
        'tipo_pago': tipo_cheque.id,
        'fecha_pago': '2024-01-15',
        'cheque_ids': [12345],
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'en_cartera' in response.data['detail'].lower()


# ── CANCEL ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_cancel_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.cancel(
        Request(factory.post('/purchase-payment/999/cancel/'), parsers=[JSONParser()]),
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
        def cancel_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceExceedsBalance())
    payload = {
        'proveedor': db_setup['proveedor'].id,
        'compras': [{'compra': db_setup['compra'].id, 'importe': '99999.00'}],
        'importe_abonado': '99999.00',
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
    }
    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'saldo pendiente' in response.data['detail'].lower()


@pytest.mark.django_db
def test_cancel_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])
    payment_id = payment.id

    response = vs.cancel(
        Request(factory.post(f'/purchase-payment/{payment_id}/cancel/'), parsers=[JSONParser()]),
        pk=payment_id,
    )

    # Anular es un borrado lógico: el pago queda como registro, con estado Anulado.
    assert response.status_code == 200
    assert response.data['estado_pago'] == 'ANULADO'
    payment.refresh_from_db()
    assert payment.estado_pago == 'ANULADO'
    assert payment.fecha_anulacion == datetime.date(2026, 11, 13)


@pytest.mark.django_db
def test_cancel_pago_ya_anulado_retorna_400(factory, db_setup):
    from pago_compra.exceptions import PaymentCancelBlockedException

    class ServiceRaises:
        def cancel_payment(self, payment_id):
            raise PaymentCancelBlockedException('El pago ya está anulado.')

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceRaises())

    response = vs.cancel(Request(factory.post('/purchase-payment/1/cancel/'), parsers=[JSONParser()]), pk=1)

    assert response.status_code == 400
    assert response.data['detail'] == 'El pago ya está anulado.'


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
    assert response.data['compras'] == []
    assert response.data['importe_a_cuenta'] == Decimal('1000000.00')
    assert response.data['proveedor'] == {
        'id': db_setup['proveedor'].id, 'nombre': 'Proveedor Test', 'puesto': 1,
    }


@pytest.mark.django_db
def test_create_pago_a_cuenta_con_compras_vacias(factory, db_setup):
    vs, _ = _make_viewset()

    response = vs.create(Request(
        factory.post('/purchase-payment/', _on_account_payload(db_setup, compras=[]), format='json'),
        parsers=[JSONParser()],
    ))

    assert response.status_code == 201
    assert response.data['compras'] == []


@pytest.mark.django_db
def test_retrieve_pago_de_compra_expone_proveedor_y_compras(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])

    response = vs.retrieve(Request(factory.get(f'/purchase-payment/{payment.id}/'), parsers=[JSONParser()]), pk=payment.id)

    assert response.data['proveedor']['nombre'] == 'Proveedor Test'
    assert [(item['id'], item['importe_aplicado']) for item in response.data['compras']] == [
        (db_setup['compra'].id, Decimal('1000.00')),
    ]
    assert response.data['importe_a_cuenta'] == Decimal('0.00')


@pytest.mark.django_db
def test_retrieve_pago_de_varias_compras_las_ordena_y_calcula_lo_que_queda_a_cuenta(factory, db_setup):
    vs, repo = _make_viewset()
    supplier = db_setup['proveedor']
    older = make_purchase(fecha='2026-01-05', importe=Decimal('800.00'), proveedor=supplier)
    newer = make_purchase(fecha='2026-02-05', importe=Decimal('900.00'), proveedor=supplier)
    payment = make_purchase_payment(
        proveedor=supplier, compra=None, importe_abonado=Decimal('2000.00'), tipo_pago=db_setup['tipo_pago'],
    )
    repo.replace_purchase_applications(payment, [(newer, Decimal('900.00')), (older, Decimal('800.00'))])

    response = vs.retrieve(Request(factory.get(f'/purchase-payment/{payment.id}/'), parsers=[JSONParser()]), pk=payment.id)

    assert response.data['compras'] == [
        {'id': older.id, 'fecha': datetime.date(2026, 1, 5), 'importe': Decimal('800.00'), 'importe_aplicado': Decimal('800.00')},
        {'id': newer.id, 'fecha': datetime.date(2026, 2, 5), 'importe': Decimal('900.00'), 'importe_aplicado': Decimal('900.00')},
    ]
    assert response.data['importe_a_cuenta'] == Decimal('300.00')


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
    assert response.data[0]['compras'] == []
    assert response.data[0]['proveedor']['nombre'] == 'Otro Proveedor'


@pytest.mark.django_db
@pytest.mark.parametrize('exception, message', [
    (PaymentSupplierMismatchException, 'La compra N° 00000001 no corresponde al proveedor del pago.'),
    (OwnCheckNotAvailableException, 'El cheque N° 885 ya se usó en el pago N° 00000120.'),
    (OwnCheckNotAvailableException, 'El cheque N° 885 está anulado: solo se pueden usar cheques emitidos.'),
    (PaymentApplicationsExceedAmountException, 'Lo aplicado a las compras (2000.00) supera el importe del pago (1500.00).'),
])
def test_create_reglas_de_proveedor_retornan_400(factory, db_setup, exception, message):
    class ServiceRaises:
        def create_payment(self, data):
            raise exception(message)
        def cancel_payment(self, payment_id): pass

    vs = PurchasePaymentViewSet(repository=FakePurchasePaymentRepo(), service=ServiceRaises())

    response = vs.create(Request(factory.post('/purchase-payment/', _on_account_payload(db_setup), format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert response.data['detail'] == message


@pytest.mark.django_db
def test_create_error_inesperado_retorna_500_generico(factory, db_setup):
    class ServiceBroken:
        def create_payment(self, data):
            raise RuntimeError('detalle interno')
        def cancel_payment(self, payment_id): pass

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
    assert 'fecha_pago' in response.data
    # En un pago con cheques el importe no se manda: sale de los cheques.
    assert 'importe_abonado' not in response.data


@pytest.mark.django_db
def test_update_cambia_las_compras_del_pago(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'], importe=Decimal('1000.00'))
    other_buy = make_purchase(proveedor=db_setup['proveedor'])

    response = _put(factory, vs, payment.id, {
        'importe_abonado': '1000.00',
        'fecha_pago': '2024-02-10',
        'compras': [{'compra': other_buy.id, 'importe': '600.00'}],
    })

    assert response.status_code == 200
    assert [(item['id'], item['importe_aplicado']) for item in response.data['compras']] == [(other_buy.id, Decimal('600.00'))]
    assert response.data['importe_a_cuenta'] == Decimal('400.00')


@pytest.mark.django_db
@pytest.mark.parametrize('compras', [
    [{'compra': 'COMPRA', 'importe': '10.00'}, {'compra': 'COMPRA', 'importe': '20.00'}],
    [{'compra': 'COMPRA', 'importe': '0'}],
    [{'compra': 999999, 'importe': '10.00'}],
])
def test_update_compras_invalidas_retorna_400(factory, db_setup, compras):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['compra'], db_setup['tipo_pago'])
    compras = [{**item, 'compra': db_setup['compra'].id if item['compra'] == 'COMPRA' else item['compra']} for item in compras]

    response = _put(factory, vs, payment.id, {'importe_abonado': '1000.00', 'fecha_pago': '2024-02-10', 'compras': compras})

    assert response.status_code == 400
    assert 'compras' in response.data


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
    (PaymentExceedsBalanceException, 'Lo aplicado a la compra N° 00000001 (9999.00) supera su saldo pendiente (1000.00).'),
    (PaymentApplicationsExceedAmountException, 'Lo aplicado a las compras (9999.00) supera el importe del pago (100.00).'),
    (PaymentSupplierMismatchException, 'La compra N° 00000001 no corresponde al proveedor del pago.'),
    (PaymentEditBlockedException, 'No se puede cambiar el importe de un pago con cheques: sale de los cheques.'),
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



# ── LIST: filtros ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_pasa_los_filtros_al_repositorio(factory):
    repo = Mock()
    repo.get_all.return_value = []
    vs = PurchasePaymentViewSet(repository=repo, service=Mock())
    query = {
        'supplier': '21', 'kind': 'A_CUENTA', 'payment_type_id': '3',
        'amount_min': '100.00', 'amount_max': '900.00', 'date_from': '2026-10-01', 'date_to': '2026-10-31',
    }

    response = vs.list(Request(factory.get('/purchase-payment/', query), parsers=[JSONParser()]))

    assert response.status_code == 200
    filters = repo.get_all.call_args.kwargs
    assert filters['supplier'] == '21'
    assert filters['kind'] == 'A_CUENTA'
    assert filters['payment_type_id'] == 3
    assert filters['amount_min'] == Decimal('100.00')
    assert filters['amount_max'] == Decimal('900.00')
    assert filters['date_from'].isoformat() == '2026-10-01'
    assert filters['date_to'].isoformat() == '2026-10-31'


@pytest.mark.django_db
def test_list_filtra_pagos_a_cuenta(factory, db_setup):
    vs, repo = _make_viewset()
    repo._add_real(db_setup['compra'], db_setup['tipo_pago'])
    make_purchase_payment(
        proveedor=db_setup['other_supplier'], compra=None, importe_abonado=Decimal('500.00'),
        tipo_pago=db_setup['tipo_pago'], fecha_pago='2024-01-02',
    )

    response = vs.list(Request(factory.get('/purchase-payment/', {'kind': 'A_CUENTA'}), parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['compras'] == []


@pytest.mark.django_db
@pytest.mark.parametrize('query, field', [
    ({'kind': 'OTRO'}, 'kind'),
    ({'date_from': 'ayer'}, 'date_from'),
    ({'amount_min': 'mucho'}, 'amount_min'),
])
def test_list_filtro_invalido_retorna_400(factory, query, field):
    request = factory.get('/purchase-payment/', query)
    force_authenticate(request, user=Mock(is_authenticated=True))

    response = PurchasePaymentViewSet.as_view({'get': 'list'})(request)

    assert response.status_code == 400
    assert field in response.data


# ── CREATE: varios cheques ─────────────────────────────────────────────────────

def _check_payload(db_setup, payment_type, **extra):
    return {
        'proveedor': db_setup['proveedor'].id,
        'compras': [{'compra': db_setup['compra'].id, 'importe': '10.00'}],
        'tipo_pago': payment_type.id,
        'fecha_pago': '2024-01-15',
        **extra,
    }


@pytest.mark.django_db
def test_create_cheque_repetido_retorna_400(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _check_payload(db_setup, make_payment_type(descripcion='Cheque'), cheque_ids=[5, 5])

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'cheque_ids' in response.data


@pytest.mark.django_db
def test_create_cheque_propio_sin_cheques_retorna_400(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _check_payload(db_setup, make_payment_type(descripcion='Cheque Propio'), own_check_ids=[])

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'own_check_ids' in response.data


@pytest.mark.django_db
def test_create_cheque_propio_repetido_retorna_400(factory, db_setup):
    vs, _ = _make_viewset()
    own_check_type = make_payment_type(descripcion='Cheque Propio')

    repeated = vs.create(Request(factory.post('/purchase-payment/', _check_payload(
        db_setup, own_check_type, own_check_ids=[1, 1],
    ), format='json'), parsers=[JSONParser()]))

    assert repeated.status_code == 400 and 'own_check_ids' in repeated.data


@pytest.mark.django_db
def test_create_efectivo_sin_importe_retorna_400(factory, db_setup):
    vs, _ = _make_viewset()
    payload = _check_payload(db_setup, db_setup['tipo_pago'])

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'importe_abonado' in response.data


@pytest.mark.django_db
def test_create_con_cheques_emitidos_usa_cada_cheque_entero(factory, db_setup):
    from pago_compra.service import PurchasePaymentService
    from pago_compra.models import PagoCompraChequePropio
    from cheque_propio.repositories import OwnCheckRepository
    from core.tests.factories import make_own_check

    first = make_own_check(importe=Decimal('3000.00'))
    second = make_own_check(importe=Decimal('2000.00'))
    service = PurchasePaymentService(
        payment_repository=PurchasePaymentRepository(), check_repository=Mock(), check_service=Mock(),
        supplier_repository=Mock(), own_check_repository=OwnCheckRepository(),
    )
    vs = PurchasePaymentViewSet(repository=PurchasePaymentRepository(), service=service)
    payload = _check_payload(db_setup, make_payment_type(descripcion='Cheque Propio'), own_check_ids=[first.id, second.id])

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 201
    assert response.data['importe_abonado'] == '5000.00'
    assert [(item['numero'], item['importe']) for item in response.data['cheques_propios']] == [
        (first.numero, Decimal('3000.00')), (second.numero, Decimal('2000.00')),
    ]
    assert PagoCompraChequePropio.objects.filter(pago_compra_id=response.data['id']).count() == 2


@pytest.mark.django_db
@pytest.mark.parametrize('payment_type, extra, field', [
    ('Cheque', {'cheque_ids': [1], 'own_check_ids': [2]}, 'own_check_ids'),
    ('Cheque Propio', {'own_check_ids': [2], 'cheque_ids': [1]}, 'cheque_ids'),
    ('Efectivo', {'importe_abonado': '10.00', 'own_check_ids': [2]}, 'own_check_ids'),
    ('Efectivo', {'importe_abonado': '10.00', 'cheque_ids': [1]}, 'cheque_ids'),
])
def test_create_no_mezcla_tipos_de_pago(factory, db_setup, payment_type, extra, field):
    vs, _ = _make_viewset()
    payment_type_obj = db_setup['tipo_pago'] if payment_type == 'Efectivo' else make_payment_type(descripcion=payment_type)
    payload = _check_payload(db_setup, payment_type_obj, **extra)

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'un pago por cada tipo de pago' in str(response.data[field]).lower()


# ── CREATE: varias compras ─────────────────────────────────────────────────────

@pytest.mark.django_db
@pytest.mark.parametrize('compras', [
    [{'compra': 'COMPRA', 'importe': '10.00'}, {'compra': 'COMPRA', 'importe': '20.00'}],
    [{'compra': 'COMPRA', 'importe': '0'}],
    [{'compra': 'COMPRA'}],
    [{'compra': 999999, 'importe': '10.00'}],
])
def test_create_compras_invalidas_retorna_400(factory, db_setup, compras):
    vs, _ = _make_viewset()
    compras = [{**item, 'compra': db_setup['compra'].id if item['compra'] == 'COMPRA' else item['compra']} for item in compras]

    response = vs.create(Request(
        factory.post('/purchase-payment/', _on_account_payload(db_setup, compras=compras), format='json'),
        parsers=[JSONParser()],
    ))

    assert response.status_code == 400
    assert 'compras' in response.data


@pytest.mark.django_db
def test_create_pago_de_varias_compras_actualiza_el_estado_de_cada_una(factory, db_setup):
    '''Con el service real: el estado y el saldo de cada compra salen de lo aplicado a ella.'''
    from pago_compra.service import PurchasePaymentService
    from compra.repositories import BuyRepository
    from compra.service import BuyService
    from proveedor.repositories import SupplierRepository

    supplier = db_setup['proveedor']
    supplier.cuenta_corriente = Decimal('3000.00')
    supplier.save()
    older = make_purchase(fecha='2026-01-05', importe=Decimal('1000.00'), proveedor=supplier)
    newer = make_purchase(fecha='2026-02-05', importe=Decimal('2000.00'), proveedor=supplier)
    service = PurchasePaymentService(
        payment_repository=PurchasePaymentRepository(), check_repository=Mock(), check_service=Mock(),
        supplier_repository=SupplierRepository(),
    )
    vs = PurchasePaymentViewSet(repository=PurchasePaymentRepository(), service=service)
    payload = _on_account_payload(db_setup, importe_abonado='2000.00', compras=[
        {'compra': older.id, 'importe': '1000.00'}, {'compra': newer.id, 'importe': '500.00'},
    ])

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 201
    assert response.data['importe_a_cuenta'] == Decimal('500.00')
    buys = BuyRepository()
    assert BuyService.calculate_payment_status(buys.get_by_id(older.id)) == 'ABONADO'
    assert BuyService.calculate_payment_status(buys.get_by_id(newer.id)) == 'PARCIAL'
    assert BuyService.calculate_outstanding_balance(buys.get_by_id(newer.id)) == Decimal('1500.00')
    supplier.refresh_from_db()
    assert supplier.cuenta_corriente == Decimal('1000.00')


@pytest.mark.django_db
def test_create_aplicado_mayor_al_saldo_de_la_compra_retorna_400(factory, db_setup):
    from pago_compra.service import PurchasePaymentService

    service = PurchasePaymentService(
        payment_repository=PurchasePaymentRepository(), check_repository=Mock(), check_service=Mock(),
        supplier_repository=Mock(),
    )
    vs = PurchasePaymentViewSet(repository=PurchasePaymentRepository(), service=service)
    payload = _on_account_payload(db_setup, importe_abonado='20000.00', compras=[
        {'compra': db_setup['compra'].id, 'importe': '10000.01'},
    ])

    response = vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'supera su saldo pendiente' in response.data['detail']
    assert not PagoCompra.objects.exists()


# ── ANULACIÓN DE PUNTA A PUNTA (DEV-150) ──────────────────────────────────────

@pytest.mark.django_db
def test_anular_pago_con_cheque_de_cliente_lo_libera_y_el_pago_lo_sigue_mostrando(factory):
    from cheque.models import Cheque
    from core.tests.factories import make_check, make_check_state
    from pago_compra.models import PagoCompraCheque

    in_portfolio = make_check_state(descripcion='EN_CARTERA')
    make_check_state(descripcion='ENDOSADO')
    check_type = make_payment_type(descripcion='Cheque')
    supplier = make_supplier(nombre='Ricardo', puesto=27)
    other_supplier = make_supplier(nombre='Migogus', puesto=21)
    check = make_check(numero=70000201, importe=Decimal('150000.00'), estado=in_portfolio)
    vs = PurchasePaymentViewSet()

    def create(supplier_id):
        payload = {'proveedor': supplier_id, 'tipo_pago': check_type.id, 'fecha_pago': '2026-11-13', 'cheque_ids': [check.id]}
        return vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    created = create(supplier.id)
    assert created.status_code == 201
    payment_id = created.data['id']

    cancelled = vs.cancel(Request(factory.post(f'/purchase-payment/{payment_id}/cancel/'), parsers=[JSONParser()]), pk=payment_id)

    assert cancelled.status_code == 200
    assert cancelled.data['estado_pago'] == 'ANULADO'
    # El pago anulado sigue mostrando el cheque con que se registró, como Liberado.
    assert [(c['numero'], c['estado']) for c in cancelled.data['cheques']] == [(70000201, 'LIBERADO')]
    check.refresh_from_db()
    assert check.estado.descripcion == 'EN_CARTERA'
    assert check.pago_compra_id is None

    # El cheque se puede usar en otro pago, a otro proveedor; el registro del anulado se conserva.
    assert create(other_supplier.id).status_code == 201
    assert PagoCompraCheque.objects.filter(cheque=check).count() == 2
    assert Cheque.objects.get(id=check.id).estado.descripcion == 'ENDOSADO'


@pytest.mark.django_db
def test_anular_pago_con_cheque_propio_lo_libera_y_el_pago_lo_sigue_mostrando(factory):
    from cheque_propio.models import OwnCheck
    from core.tests.factories import make_own_check
    from pago_compra.models import PagoCompraChequePropio

    own_check_type = make_payment_type(descripcion='Cheque Propio')
    supplier = make_supplier(nombre='Ricardo', puesto=27)
    other_supplier = make_supplier(nombre='Migogus', puesto=21)
    own_check = make_own_check(numero=885, importe=Decimal('500000.00'))
    vs = PurchasePaymentViewSet()

    def create(supplier_id):
        payload = {
            'proveedor': supplier_id, 'tipo_pago': own_check_type.id, 'fecha_pago': '2026-11-13',
            'own_check_ids': [own_check.id],
        }
        return vs.create(Request(factory.post('/purchase-payment/', payload, format='json'), parsers=[JSONParser()]))

    created = create(supplier.id)
    assert created.status_code == 201
    payment_id = created.data['id']
    assert OwnCheck.objects.get(id=own_check.id).pago_compra_id == payment_id
    # Mientras el pago está vigente, el cheque no se puede usar en otro.
    assert create(other_supplier.id).status_code == 400

    cancelled = vs.cancel(Request(factory.post(f'/purchase-payment/{payment_id}/cancel/'), parsers=[JSONParser()]), pk=payment_id)

    assert cancelled.status_code == 200
    assert [(c['numero'], c['estado']) for c in cancelled.data['cheques_propios']] == [(885, 'LIBERADO')]
    assert OwnCheck.objects.get(id=own_check.id).pago_compra_id is None

    # El cheque se puede usar en otro pago, a otro proveedor; el historial del anulado se conserva.
    reused = create(other_supplier.id)
    assert reused.status_code == 201
    assert OwnCheck.objects.get(id=own_check.id).pago_compra_id == reused.data['id']
    assert PagoCompraChequePropio.objects.filter(cheque_propio=own_check).count() == 2


@pytest.mark.django_db
@pytest.mark.parametrize('own_check_state, shown', [('EMITIDO', 'LIBERADO'), ('RECHAZADO', 'RECHAZADO'), ('ANULADO', 'ANULADO')])
def test_pago_anulado_muestra_sus_cheques_propios_liberados_salvo_los_caidos(own_check_state, shown):
    from core.tests.factories import make_own_check
    from pago_compra.serializers import PurchasePaymentResponseSerializer

    own_check = make_own_check(numero=885, importe=Decimal('500000.00'), estado=own_check_state)
    payment = make_purchase_payment(compra=None, importe_abonado=Decimal('500000.00'), cheque_propio=own_check, estado_pago='ANULADO')

    data = PurchasePaymentResponseSerializer(PurchasePaymentRepository().get_by_id(payment.id)).data

    assert [(c['numero'], c['estado']) for c in data['cheques_propios']] == [(885, shown)]
