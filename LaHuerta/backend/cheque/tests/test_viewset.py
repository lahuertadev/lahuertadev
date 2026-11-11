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

    def get_all(self, bank=None, state=None, endorsed=None, deposit_date_from=None, deposit_date_to=None):
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
