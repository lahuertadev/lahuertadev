import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser
from rest_framework.exceptions import ValidationError

from banco.models import Banco
from cheque_propio.models import OwnCheck
from cheque_propio.views import OwnCheckViewSet
from cheque_propio.interfaces import IOwnCheckRepository
from cheque_propio.repositories import OwnCheckRepository
from core.tests.factories import (
    make_bank, make_own_check, make_payment_type, make_purchase, make_purchase_payment, make_supplier,
)


def _mock_banco(id=1, descripcion='Nación'):
    obj = Mock(spec=Banco)
    obj.id = id
    obj.pk = id
    obj.descripcion = descripcion
    obj._meta = Mock()
    obj._meta.model = Banco
    return obj


def _mock_own_check(numero, importe=Decimal('1000.00'), banco=None, estado=OwnCheck.State.EMITIDO,
                     fecha_emision='2024-01-01', fecha_deposito=None, fecha_vencimiento='2024-06-01',
                     observaciones=None, pagocompra_list=None):
    obj = Mock(spec=OwnCheck)
    obj.id = numero
    obj.numero = numero
    obj.pk = numero
    obj.importe = importe
    obj.fecha_emision = fecha_emision
    obj.fecha_deposito = fecha_deposito
    obj.fecha_vencimiento = fecha_vencimiento
    obj.banco = banco or _mock_banco()
    obj.estado = estado
    obj.observaciones = observaciones
    obj._meta = Mock()
    obj._meta.model = OwnCheck

    payments = pagocompra_list or []
    pagocompra_qs = Mock()
    pagocompra_qs.first.return_value = payments[0] if payments else None
    pagocompra_qs.all.return_value = payments
    pagocompra_qs.exists.return_value = bool(payments)
    pagocompra_qs.aggregate.return_value = {'total': None}
    pagocompra_qs.select_related.return_value = payments
    obj.pagocompra_set = pagocompra_qs

    # Uso del cheque en cada pago (pago_compra_cheque_propio): por defecto, el pago entero.
    uses = [Mock(pago_compra=payment, importe=getattr(payment, 'importe_abonado', Decimal('0'))) for payment in payments]
    uses_qs = Mock()
    uses_qs.all.return_value = uses
    uses_qs.exists.return_value = bool(uses)
    uses_qs.aggregate.return_value = {'total': None}
    obj.payment_uses = uses_qs
    return obj


class FakeOwnCheckRepo(IOwnCheckRepository):
    def __init__(self):
        self._items = {}
        self._duplicate = False

    def _add(self, numero=1001, importe=Decimal('1000.00'), banco=None, estado=OwnCheck.State.EMITIDO,
              pagocompra_list=None):
        obj = _mock_own_check(numero=numero, importe=importe, banco=banco, estado=estado,
                                pagocompra_list=pagocompra_list)
        self._items[numero] = obj
        return obj

    def get_all(self, state=None, bank=None, available=None, supplier_id=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def exists_duplicate(self, number, bank, exclude_id=None):
        return self._duplicate

    def create(self, data):
        numero = data.get('numero')
        obj = _mock_own_check(
            numero=numero,
            importe=data.get('importe', Decimal('0.00')),
            banco=data.get('banco', _mock_banco()),
            estado=data.get('estado', OwnCheck.State.EMITIDO),
            fecha_emision=str(data.get('fecha_emision', '2024-01-01')),
            fecha_deposito=str(data['fecha_deposito']) if data.get('fecha_deposito') else None,
            fecha_vencimiento=str(data.get('fecha_vencimiento', '2024-06-01')),
            observaciones=data.get('observaciones'),
        )
        self._items[numero] = obj
        return obj

    def update(self, own_check, data):
        for k, v in data.items():
            setattr(own_check, k, v)
        return own_check

    def delete(self, own_check):
        self._items.pop(own_check.numero, None)

    def get_payment_uses(self, own_check):
        return own_check.payment_uses.all()

    def delete_payment_use(self, use):
        pass


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return OwnCheckViewSet(repository=FakeOwnCheckRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get('/own-checks/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.repository._add(1001)
    viewset.repository._add(1002)

    request = factory.get('/own-checks/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get('/own-checks/9999/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=9999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


def test_retrieve_success(factory, viewset):
    viewset.repository._add(1001)

    request = factory.get('/own-checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    banco = make_bank(descripcion='Nación')

    payload = {
        'numero': 3001,
        'importe': '1500.00',
        'fecha_emision': '2024-03-01',
        'fecha_vencimiento': '2024-09-01',
        'banco': banco.id,
    }

    request = factory.post('/own-checks/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data['numero'] == 3001


@pytest.mark.django_db
def test_create_missing_required_fields(factory, viewset):
    # is_valid(raise_exception=True) está fuera del try/except en create(): sin pasar
    # por el dispatch real de DRF (que sí convierte ValidationError en 400), acá se
    # observa la excepción directamente.
    request = factory.post('/own-checks/', {}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])

    with pytest.raises(ValidationError) as exc_info:
        viewset.create(drf_request)

    assert 'numero' in exc_info.value.detail


@pytest.mark.django_db
def test_create_duplicado(factory, viewset):
    banco = make_bank(descripcion='Nación')
    viewset.repository._duplicate = True

    payload = {
        'numero': 3001,
        'importe': '1500.00',
        'fecha_emision': '2024-03-01',
        'fecha_vencimiento': '2024-09-01',
        'banco': banco.id,
    }

    request = factory.post('/own-checks/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert 'ya existe' in response.data['detail'].lower()


@pytest.mark.django_db
def test_create_fecha_deposito_posterior_a_vencimiento(factory, viewset):
    banco = make_bank(descripcion='Nación')

    payload = {
        'numero': 3001,
        'importe': '1500.00',
        'fecha_emision': '2024-03-01',
        'fecha_deposito': '2024-10-01',
        'fecha_vencimiento': '2024-09-01',
        'banco': banco.id,
    }

    request = factory.post('/own-checks/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert 'vencimiento' in response.data['detail'].lower()


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    banco = make_bank(descripcion='Nación')

    payload = {
        'numero': 9999, 'importe': '1000.00', 'fecha_emision': '2024-01-01',
        'fecha_vencimiento': '2024-06-01', 'banco': banco.id,
    }

    request = factory.put('/own-checks/9999/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=9999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_update_success(factory, viewset):
    banco = make_bank(descripcion='Nación')
    viewset.repository._add(1001, banco=_mock_banco(banco.id))

    payload = {
        'numero': 1001, 'importe': '2000.00', 'fecha_emision': '2024-01-01',
        'fecha_vencimiento': '2024-06-01', 'banco': banco.id,
    }

    request = factory.put('/own-checks/1001/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=1001)

    assert response.status_code == 200


@pytest.mark.django_db
def test_update_bloqueado_si_usado_en_pago(factory, viewset):
    banco = make_bank(descripcion='Nación')
    payment = Mock()
    payment.proveedor.nombre = 'Proveedor Test'
    viewset.repository._add(1001, importe=Decimal('1000.00'), banco=_mock_banco(banco.id),
                              pagocompra_list=[payment])

    payload = {
        'numero': 9999, 'importe': '1000.00', 'fecha_emision': '2024-01-01',
        'fecha_vencimiento': '2024-06-01', 'banco': banco.id,
    }

    request = factory.put('/own-checks/1001/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=1001)

    assert response.status_code == 400
    assert 'proveedor test' in response.data['detail'].lower()


# ------------------------- PARTIAL UPDATE ------------------
@pytest.mark.django_db
def test_partial_update_not_found(factory, viewset):
    request = factory.patch('/own-checks/9999/', {'observaciones': 'x'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=9999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_partial_update_success(factory, viewset):
    banco = make_bank(descripcion='Nación')
    viewset.repository._add(1001, banco=_mock_banco(banco.id))

    request = factory.patch('/own-checks/1001/', {'observaciones': 'nota'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=1001)

    assert response.status_code == 200


# ------------------------- DELETE --------------------------
def test_destroy_not_found(factory, viewset):
    request = factory.delete('/own-checks/9999/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=9999)

    assert response.status_code == 404


def test_destroy_success(factory, viewset):
    viewset.repository._add(1001)

    request = factory.delete('/own-checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=1001)

    assert response.status_code == 204
    assert viewset.repository.get_by_id(1001) is None


def test_destroy_con_pagos_asociados_retorna_400(factory, viewset):
    from django.db.models import ProtectedError
    own_check = viewset.repository._add(1001)
    viewset.repository.delete = Mock(side_effect=ProtectedError('protected', [own_check]))

    request = factory.delete('/own-checks/1001/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=1001)

    assert response.status_code == 400
    assert 'pagos asociados' in response.data['detail'].lower()


# ── CASH ─────────────────────────────────────────────────────────────────────

def test_cash_not_found(factory, viewset):
    request = factory.post('/own-checks/9999/cash/')
    response = viewset.cash(Request(request, parsers=[JSONParser()]), pk=9999)

    assert response.status_code == 404


def test_cash_invalid_transition(factory, viewset):
    viewset.repository._add(1001, estado=OwnCheck.State.COBRADO)

    request = factory.post('/own-checks/1001/cash/')
    response = viewset.cash(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'emitido' in response.data['detail'].lower()


def test_cash_success(factory, viewset):
    payment = Mock()
    viewset.repository._add(
        1001, estado=OwnCheck.State.EMITIDO, pagocompra_list=[payment],
    )
    viewset.repository._items[1001].fecha_deposito = date.today() - timedelta(days=1)

    request = factory.post('/own-checks/1001/cash/')
    response = viewset.cash(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['numero'] == 1001


# ── CANCEL ────────────────────────────────────────────────────────────────────

def test_cancel_not_found(factory, viewset):
    request = factory.post('/own-checks/9999/cancel/')
    response = viewset.cancel(Request(request, parsers=[JSONParser()]), pk=9999)

    assert response.status_code == 404


def test_cancel_invalid_transition(factory, viewset):
    viewset.repository._add(1001, estado=OwnCheck.State.ANULADO)

    request = factory.post('/own-checks/1001/cancel/')
    response = viewset.cancel(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 400
    assert 'emitido' in response.data['detail'].lower()


def test_cancel_success_revierte_pagos(factory, viewset):
    payment = Mock()
    payment.importe_abonado = Decimal('500.00')
    payment.proveedor.cuenta_corriente = Decimal('1000.00')
    viewset.repository._add(1001, estado=OwnCheck.State.EMITIDO, pagocompra_list=[payment])

    request = factory.post('/own-checks/1001/cancel/')
    response = viewset.cancel(Request(request, parsers=[JSONParser()]), pk=1001)

    assert response.status_code == 200
    assert response.data['estado'] == OwnCheck.State.ANULADO
    assert payment.proveedor.cuenta_corriente == Decimal('1500.00')



# ── DETALLE: PROVEEDOR Y PAGOS (DEV-141) ─────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_expone_proveedor_y_pagos_de_compras_y_a_cuenta(factory):
    supplier = make_supplier(nombre='Ricardo', puesto=27)
    buy = make_purchase(fecha='2026-10-22', importe=Decimal('670000.00'), proveedor=supplier)
    payment_type = make_payment_type(descripcion='Cheque Propio')
    own_check = make_own_check(
        numero=884, importe=Decimal('1000000.00'), fecha_emision='2026-10-27',
        fecha_vencimiento='2027-01-23',
    )
    on_account = make_purchase_payment(
        proveedor=supplier, compra=None, importe_abonado=Decimal('150000.00'), tipo_pago=payment_type,
        fecha_pago='2026-10-29', cheque_propio=own_check,
    )
    purchase_payment = make_purchase_payment(
        proveedor=supplier, compra=buy, importe_abonado=Decimal('300000.00'), tipo_pago=payment_type,
        fecha_pago='2026-10-28', cheque_propio=own_check,
    )
    viewset = OwnCheckViewSet(repository=OwnCheckRepository())

    response = viewset.retrieve(Request(factory.get(f'/own-checks/{own_check.id}/'), parsers=[JSONParser()]), pk=own_check.id)

    assert response.status_code == 200
    data = response.data
    assert data['supplier'] == {'id': supplier.id, 'nombre': 'Ricardo', 'puesto': 27}
    assert data['supplier_name'] == 'Ricardo'
    assert data['used_amount'] == Decimal('450000.00')
    assert data['remaining_balance'] == Decimal('550000.00')
    assert data['purchases'] == [buy.id]
    # Ordenados por fecha de pago: primero el de compras (28-10), después el a cuenta (29-10).
    assert [p['id'] for p in data['payments']] == [purchase_payment.id, on_account.id]
    assert data['payments'][0]['tipo'] == 'COMPRA'
    assert data['payments'][0]['compra']['id'] == buy.id
    assert data['payments'][1]['tipo'] == 'A_CUENTA'
    assert data['payments'][1]['compra'] is None
    assert data['payments'][1]['importe_abonado'] == Decimal('150000.00')


@pytest.mark.django_db
def test_retrieve_cheque_sin_usar_no_tiene_proveedor_ni_pagos(factory):
    own_check = make_own_check(
        numero=883, importe=Decimal('1000000.00'), fecha_emision='2026-10-27',
        fecha_vencimiento='2027-01-22',
    )
    viewset = OwnCheckViewSet(repository=OwnCheckRepository())

    response = viewset.retrieve(Request(factory.get(f'/own-checks/{own_check.id}/'), parsers=[JSONParser()]), pk=own_check.id)

    assert response.data['supplier'] is None
    assert response.data['payments'] == []
    assert response.data['used_amount'] == Decimal('0')
