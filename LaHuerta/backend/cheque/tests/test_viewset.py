import pytest
from decimal import Decimal

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser
from rest_framework.exceptions import ValidationError

from core.tests.factories import make_bank, make_check_state, make_purchase_payment
from core.tests.mocks import mock_bank, mock_check, mock_check_state, mock_purchase_payment, mock_supplier
from cheque.views import CheckViewSet
from cheque.interfaces import ICheckRepository


def _default_bank():
    return mock_bank(id=1, descripcion='Nación')


def _default_state():
    return mock_check_state(id=1, descripcion='EN_CARTERA')


def _mock_cheque(numero, banco=None, estado=None, fecha_emision='2024-01-01', **overrides):
    return mock_check(
        id=numero,
        numero=numero,
        banco=banco or _default_bank(),
        estado=estado or _default_state(),
        fecha_emision=fecha_emision,
        **overrides,
    )


class FakeCheckRepo(ICheckRepository):
    def __init__(self):
        self._items = {}

    def _add(self, numero=1001, importe=Decimal('1000.00'), banco=None, estado=None):
        obj = _mock_cheque(numero=numero, importe=importe, banco=banco, estado=estado)
        self._items[numero] = obj
        return obj

    def get_all(self, number=None, bank=None, state=None, endorsed=None, deposit_date_from=None, deposit_date_to=None, tab=None):
        self.last_tab = tab
        self.last_number = number
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def exists_duplicate(self, number, bank, client, exclude_id=None):
        return False

    def create(self, data):
        numero = data.get('numero')
        obj = _mock_cheque(
            numero=numero,
            importe=data.get('importe', Decimal('0.00')),
            banco=data.get('banco', _default_bank()),
            estado=data.get('estado', _default_state()),
            fecha_emision=str(data.get('fecha_emision', '2024-01-01')),
            fecha_deposito=str(data['fecha_deposito']) if data.get('fecha_deposito') else None,
            fecha_endoso=str(data['fecha_endoso']) if data.get('fecha_endoso') else None,
            endosado=data.get('endosado', False),
        )
        self._items[numero] = obj
        return obj

    def update(self, check, data):
        for k, v in data.items():
            setattr(check, k, v)
        return check

    def delete(self, check):
        self._items.pop(check.numero, None)

    def get_purchase_payment_ids(self, check):
        return getattr(self, '_recorded', {}).get(check.id, [])


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return CheckViewSet(repository=FakeCheckRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get('/checks/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.repository._add(1001)
    viewset.repository._add(1002)

    request = factory.get('/checks/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


def test_list_passes_tab_to_repository(factory, viewset):
    request = factory.get('/checks/', {'solapa': 'pendientes'})
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert viewset.repository.last_tab == 'pendientes'


def test_list_without_tab_passes_none(factory, viewset):
    request = factory.get('/checks/')
    drf_request = Request(request, parsers=[JSONParser()])
    viewset.list(drf_request)

    assert viewset.repository.last_tab is None


def test_list_passes_number_to_repository(factory, viewset):
    request = factory.get('/checks/', {'numero': '9001'})
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert viewset.repository.last_number == '9001'


def test_list_number_with_letters_returns_400(factory, viewset):
    request = factory.get('/checks/', {'numero': '90a1'})
    drf_request = Request(request, parsers=[JSONParser()])

    with pytest.raises(ValidationError):
        viewset.list(drf_request)


def test_list_invalid_tab_returns_400(factory, viewset):
    request = factory.get('/checks/', {'solapa': 'acreditados'})
    drf_request = Request(request, parsers=[JSONParser()])

    with pytest.raises(ValidationError):
        viewset.list(drf_request)


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get('/checks/9999/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


def test_retrieve_success(factory, viewset):
    viewset.repository._add(1001)

    request = factory.get('/checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


def test_retrieve_success_con_pago_compra_asociado(factory, viewset):
    pago_compra = mock_purchase_payment(
        id=42,
        fecha_pago='2024-05-01',
        importe_abonado=Decimal('750.00'),
        proveedor=mock_supplier(nombre='Proveedor Test'),
    )
    check = _mock_cheque(1001, endosado=True, pago_compra=pago_compra)
    viewset.repository._items[1001] = check

    request = factory.get('/checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=1001)

    assert response.status_code == 200
    assert response.data['pago_compra']['id'] == 42
    assert response.data['pago_compra']['proveedor'] == 'Proveedor Test'
    assert response.data['pago_compra']['importe_abonado'] == Decimal('750.00')


def test_retrieve_success_sin_pago_compra_es_none(factory, viewset):
    viewset.repository._add(1001)

    request = factory.get('/checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=1001)

    assert response.data['pago_compra'] is None


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    banco = make_bank(descripcion='Nación')
    estado = make_check_state(descripcion='EN_CARTERA')

    payload = {
        'numero': 3001,
        'importe': '1500.00',
        'fecha_emision': '2024-03-01',
        'banco': banco.id,
        'estado': estado.id,
    }

    request = factory.post('/checks/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data['numero'] == 3001


@pytest.mark.django_db
def test_create_missing_required_fields(factory, viewset):
    # is_valid(raise_exception=True) está fuera del try/except en create(): sin pasar
    # por el dispatch real de DRF (que sí convierte ValidationError en 400), acá se
    # observa la excepción directamente.
    request = factory.post('/checks/', {}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])

    with pytest.raises(ValidationError) as exc_info:
        viewset.create(drf_request)

    assert 'numero' in exc_info.value.detail


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    banco = make_bank(descripcion='Nación')
    estado = make_check_state(descripcion='EN_CARTERA')

    payload = {
        'numero': 9999,
        'importe': '1000.00',
        'fecha_emision': '2024-01-01',
        'banco': banco.id,
        'estado': estado.id,
    }

    request = factory.put('/checks/9999/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_update_success(factory, viewset):
    banco = make_bank(descripcion='Nación')
    estado = make_check_state(descripcion='EN_CARTERA')
    viewset.repository._add(1001, banco=mock_bank(id=banco.id), estado=mock_check_state(id=estado.id, descripcion='EN_CARTERA'))

    payload = {
        'numero': 1001,
        'importe': '2000.00',
        'fecha_emision': '2024-01-01',
        'banco': banco.id,
        'estado': estado.id,
    }

    request = factory.put('/checks/1001/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=1001)

    assert response.status_code == 200


# ------------------------- PARTIAL UPDATE ------------------
@pytest.mark.django_db
def test_partial_update_not_found(factory, viewset):
    request = factory.patch('/checks/9999/', {'importe': '500.00'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=9999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_partial_update_success(factory, viewset):
    banco = make_bank(descripcion='Nación')
    estado = make_check_state(descripcion='EN_CARTERA')
    viewset.repository._add(1001, banco=mock_bank(id=banco.id), estado=mock_check_state(id=estado.id, descripcion='EN_CARTERA'))

    request = factory.patch('/checks/1001/', {'importe': '750.00'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=1001)

    assert response.status_code == 200


# ------------------------- DELETE --------------------------
def test_destroy_not_found(factory, viewset):
    request = factory.delete('/checks/9999/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


def test_destroy_success(factory, viewset):
    viewset.repository._add(1001)

    request = factory.delete('/checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=1001)

    assert response.status_code == 204
    assert viewset.repository.get_by_id(1001) is None


def test_destroy_cheque_registrado_en_un_pago_a_proveedor_devuelve_400(factory, viewset):
    check = viewset.repository._add(1001)
    check.pago_cliente_id = None
    check.pago_compra_id = None
    viewset.repository._recorded = {check.id: [120]}

    request = factory.delete('/checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=1001)

    assert response.status_code == 400
    assert 'registro' in response.data['detail']
    assert viewset.repository.get_by_id(1001) is not None


def test_destroy_cheque_de_un_pago_de_cliente_indica_anular_el_pago(factory, viewset):
    check = viewset.repository._add(1001)
    check.pago_cliente_id = 7
    check.pago_compra_id = None

    request = factory.delete('/checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=1001)

    assert response.status_code == 400
    assert 'anulá el pago' in response.data['detail']
    assert viewset.repository.get_by_id(1001) is not None


# ── ENDORSE ──────────────────────────────────────────────────────────────────

def _create_pago_compra():
    return make_purchase_payment()


@pytest.mark.django_db
def test_endorse_not_found(factory, viewset):
    pago_compra = _create_pago_compra()

    request = factory.post('/checks/9999/endorse/', {'pago_compra': pago_compra.id}, format='json')
    response = viewset.endorse(Request(request, parsers=[JSONParser()]), pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_endorse_already_endorsed(factory, viewset):
    pago_compra = _create_pago_compra()
    viewset.repository._add(1001)
    viewset.repository._items[1001].endosado = True

    request = factory.post('/checks/1001/endorse/', {'pago_compra': pago_compra.id}, format='json')
    response = viewset.endorse(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'endosado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_endorse_invalid_state(factory, viewset):
    pago_compra = _create_pago_compra()
    estado = make_check_state(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=mock_check_state(id=estado.id, descripcion='DEPOSITADO'))

    request = factory.post('/checks/1001/endorse/', {'pago_compra': pago_compra.id}, format='json')
    response = viewset.endorse(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'en_cartera' in response.data['detail'].lower()


@pytest.mark.django_db
def test_endorse_success(factory, viewset):
    pago_compra = _create_pago_compra()
    make_check_state(descripcion='ENDOSADO')
    viewset.repository._add(1001)

    request = factory.post('/checks/1001/endorse/', {'pago_compra': pago_compra.id}, format='json')
    response = viewset.endorse(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


# ── DEPOSIT ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_deposit_not_found(factory, viewset):
    request = factory.post('/checks/9999/deposit/')
    response = viewset.deposit(Request(request, parsers=[JSONParser()]), pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_deposit_invalid_state(factory, viewset):
    estado = make_check_state(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=mock_check_state(id=estado.id, descripcion='DEPOSITADO'))

    request = factory.post('/checks/1001/deposit/')
    response = viewset.deposit(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'en_cartera' in response.data['detail'].lower()


@pytest.mark.django_db
def test_deposit_success(factory, viewset):
    make_check_state(descripcion='DEPOSITADO')
    viewset.repository._add(1001)  # EN_CARTERA por defecto

    request = factory.post('/checks/1001/deposit/')
    response = viewset.deposit(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


# ── CREDIT ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_credit_not_found(factory, viewset):
    request = factory.post('/checks/9999/credit/')
    response = viewset.credit(Request(request, parsers=[JSONParser()]), pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_credit_invalid_state(factory, viewset):
    estado = make_check_state(descripcion='EN_CARTERA')
    viewset.repository._add(1001, estado=mock_check_state(id=estado.id, descripcion='EN_CARTERA'))

    request = factory.post('/checks/1001/credit/')
    response = viewset.credit(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'depositado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_credit_success(factory, viewset):
    make_check_state(descripcion='ACREDITADO')
    estado = make_check_state(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=mock_check_state(id=estado.id, descripcion='DEPOSITADO'))

    request = factory.post('/checks/1001/credit/')
    response = viewset.credit(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


# ── REJECT ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_reject_not_found(factory, viewset):
    request = factory.post('/checks/9999/reject/')
    response = viewset.reject(Request(request, parsers=[JSONParser()]), pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_reject_invalid_state(factory, viewset):
    estado = make_check_state(descripcion='EN_CARTERA')
    viewset.repository._add(1001, estado=mock_check_state(id=estado.id, descripcion='EN_CARTERA'))

    request = factory.post('/checks/1001/reject/')
    response = viewset.reject(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'depositado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_reject_success(factory, viewset):
    make_check_state(descripcion='RECHAZADO')
    estado = make_check_state(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=mock_check_state(id=estado.id, descripcion='DEPOSITADO'))

    request = factory.post('/checks/1001/reject/')
    response = viewset.reject(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


@pytest.mark.django_db
def test_reject_endosado_con_la_base_baja_el_pago_desde_la_compra_mas_nueva(factory):
    '''
    De punta a punta: un pago de $3.000 con dos cheques cubre dos compras. Al rechazar el cheque
    de $1.000, el pago baja a $2.000, la compra más nueva vuelve a Parcial y se le vuelve a deber
    ese importe al proveedor.
    '''
    from cheque.repositories import CheckRepository
    from compra.repositories import BuyRepository
    from compra.service import BuyService
    from core.tests.factories import make_check, make_payment_type, make_purchase, make_purchase_application, make_supplier
    from pago_compra.models import PagoCompra

    make_check_state(descripcion='RECHAZADO')
    endorsed = make_check_state(descripcion='ENDOSADO')
    supplier = make_supplier(cuenta_corriente=Decimal('0.00'))
    older = make_purchase(fecha='2026-10-01', importe=Decimal('1500.00'), proveedor=supplier)
    newer = make_purchase(fecha='2026-10-20', importe=Decimal('1500.00'), proveedor=supplier)
    payment = make_purchase_payment(
        proveedor=supplier, compra=None, importe_abonado=Decimal('3000.00'), tipo_pago=make_payment_type(descripcion='Cheque'),
    )
    make_purchase_application(pago_compra=payment, compra=older, importe=Decimal('1500.00'))
    make_purchase_application(pago_compra=payment, compra=newer, importe=Decimal('1500.00'))
    rejected = make_check(importe=Decimal('1000.00'), endosado=True, estado=endorsed, pago_compra=payment)
    make_check(importe=Decimal('2000.00'), endosado=True, estado=endorsed, pago_compra=payment)
    viewset = CheckViewSet(repository=CheckRepository())

    response = viewset.reject(Request(factory.post(f'/checks/{rejected.id}/reject/'), parsers=[JSONParser()]), pk=rejected.id)

    assert response.status_code == 200
    assert PagoCompra.objects.get(id=payment.id).importe_abonado == Decimal('2000.00')
    buys = BuyRepository()
    assert BuyService.calculate_payment_status(buys.get_by_id(older.id)) == 'ABONADO'
    assert BuyService.calculate_payment_status(buys.get_by_id(newer.id)) == 'PARCIAL'
    assert BuyService.calculate_outstanding_balance(buys.get_by_id(newer.id)) == Decimal('1000.00')
    supplier.refresh_from_db()
    assert supplier.cuenta_corriente == Decimal('1000.00')
