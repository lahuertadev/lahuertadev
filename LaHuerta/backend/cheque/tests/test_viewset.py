import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from banco.models import Banco
from estado_cheque.models import EstadoCheque
from mercado.models import Mercado
from proveedor.models import Proveedor
from compra.models import Compra
from pago_compra.models import PagoCompra
from cheque.models import Cheque
from cheque.views import CheckViewSet
from cheque.interfaces import ICheckRepository


def _mock_banco(id=1, descripcion='Nación'):
    obj = Mock(spec=Banco)
    obj.id = id
    obj.pk = id
    obj.descripcion = descripcion
    obj._meta = Mock()
    obj._meta.model = Banco
    return obj


def _mock_estado(id=1, descripcion='EN_CARTERA'):
    obj = Mock(spec=EstadoCheque)
    obj.id = id
    obj.pk = id
    obj.descripcion = descripcion
    obj._meta = Mock()
    obj._meta.model = EstadoCheque
    return obj


def _mock_cheque(numero, importe=Decimal('1000.00'), banco=None, estado=None,
                 fecha_emision='2024-01-01', fecha_deposito=None, fecha_endoso=None,
                 endosado=False, pago_cliente=None, pago_compra=None):
    obj = Mock(spec=Cheque)
    obj.numero = numero
    obj.pk = numero
    obj.importe = importe
    obj.fecha_emision = fecha_emision
    obj.fecha_deposito = fecha_deposito
    obj.fecha_endoso = fecha_endoso
    obj.endosado = endosado
    obj.banco = banco or _mock_banco()
    obj.estado = estado or _mock_estado()
    obj.pago_cliente = pago_cliente
    obj.pago_cliente_id = pago_cliente.id if pago_cliente else None
    obj.pago_compra = pago_compra
    obj.pago_compra_id = pago_compra.id if pago_compra else None
    obj._meta = Mock()
    obj._meta.model = Cheque
    return obj


class FakeCheckRepo(ICheckRepository):
    def __init__(self):
        self._items = {}

    def _add(self, numero=1001, importe=Decimal('1000.00'), banco=None, estado=None):
        obj = _mock_cheque(numero=numero, importe=importe, banco=banco, estado=estado)
        self._items[numero] = obj
        return obj

    def get_all(self, banco=None, estado=None, endosado=None, fecha_deposito_desde=None, fecha_deposito_hasta=None):
        return list(self._items.values())

    def get_by_id(self, numero):
        return self._items.get(int(numero))

    def create(self, data):
        numero = data.get('numero')
        obj = _mock_cheque(
            numero=numero,
            importe=data.get('importe', Decimal('0.00')),
            banco=data.get('banco', _mock_banco()),
            estado=data.get('estado', _mock_estado()),
            fecha_emision=str(data.get('fecha_emision', '2024-01-01')),
            fecha_deposito=str(data['fecha_deposito']) if data.get('fecha_deposito') else None,
            fecha_endoso=str(data['fecha_endoso']) if data.get('fecha_endoso') else None,
            endosado=data.get('endosado', False),
        )
        self._items[numero] = obj
        return obj

    def update(self, cheque, data):
        for k, v in data.items():
            setattr(cheque, k, v)
        return cheque

    def delete(self, cheque):
        self._items.pop(cheque.numero, None)


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


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    banco = Banco.objects.create(descripcion='Nación')
    estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')

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
    request = factory.post('/checks/', {}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert 'numero' in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    banco = Banco.objects.create(descripcion='Nación')
    estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')

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
    banco = Banco.objects.create(descripcion='Nación')
    estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')
    viewset.repository._add(1001, banco=_mock_banco(banco.id), estado=_mock_estado(estado.id))

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
    banco = Banco.objects.create(descripcion='Nación')
    estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')
    viewset.repository._add(1001, banco=_mock_banco(banco.id), estado=_mock_estado(estado.id))

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
    mercado = Mercado.objects.create(descripcion='Mercado Test')
    proveedor = Proveedor.objects.create(
        nombre='Prov Test', puesto=1, telefono='11111111',
        cuenta_corriente=0, nombre_fantasia='Prov', mercado=mercado,
    )
    compra = Compra.objects.create(
        fecha='2024-01-01', importe='1000.00', senia='0.00', proveedor=proveedor,
    )
    return PagoCompra.objects.create(compra=compra, importe_abonado='1000.00')


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
    estado = EstadoCheque.objects.create(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=_mock_estado(estado.id, 'DEPOSITADO'))

    request = factory.post('/checks/1001/endorse/', {'pago_compra': pago_compra.id}, format='json')
    response = viewset.endorse(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'en_cartera' in response.data['detail'].lower()


@pytest.mark.django_db
def test_endorse_success(factory, viewset):
    pago_compra = _create_pago_compra()
    EstadoCheque.objects.create(descripcion='ENDOSADO')
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
    estado = EstadoCheque.objects.create(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=_mock_estado(estado.id, 'DEPOSITADO'))

    request = factory.post('/checks/1001/deposit/')
    response = viewset.deposit(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'en_cartera' in response.data['detail'].lower()


@pytest.mark.django_db
def test_deposit_success(factory, viewset):
    EstadoCheque.objects.create(descripcion='DEPOSITADO')
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
    estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')
    viewset.repository._add(1001, estado=_mock_estado(estado.id, 'EN_CARTERA'))

    request = factory.post('/checks/1001/credit/')
    response = viewset.credit(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'depositado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_credit_success(factory, viewset):
    EstadoCheque.objects.create(descripcion='ACREDITADO')
    estado = EstadoCheque.objects.create(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=_mock_estado(estado.id, 'DEPOSITADO'))

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
    estado = EstadoCheque.objects.create(descripcion='EN_CARTERA')
    viewset.repository._add(1001, estado=_mock_estado(estado.id, 'EN_CARTERA'))

    request = factory.post('/checks/1001/reject/')
    response = viewset.reject(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'depositado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_reject_success(factory, viewset):
    EstadoCheque.objects.create(descripcion='RECHAZADO')
    estado = EstadoCheque.objects.create(descripcion='DEPOSITADO')
    viewset.repository._add(1001, estado=_mock_estado(estado.id, 'DEPOSITADO'))

    request = factory.post('/checks/1001/reject/')
    response = viewset.reject(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001
