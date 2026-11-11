import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock

from cheque_propio.models import OwnCheck
from cheque_propio.service import OwnCheckService
from cheque_propio.exceptions import (
    OwnCheckAlreadyExistsException,
    OwnCheckEditBlockedException,
    OwnCheckInvalidDateRangeException,
    OwnCheckInvalidTransitionException,
)
from core.tests.mocks import mock_own_check, mock_own_check_use, mock_purchase_payment, mock_supplier


def _make_own_check(numero=1001, importe=Decimal('1000.00'), used_in_purchase=False, supplier_names=None):
    own_check = mock_own_check(id=1, numero=numero, importe=importe, fecha_vencimiento=None)
    own_check.pagocompra_set.exists.return_value = used_in_purchase
    if used_in_purchase:
        own_check.pagocompra_set.select_related.return_value = [
            mock_purchase_payment(proveedor=mock_supplier(nombre=name))
            for name in (supplier_names or ['Proveedor Test'])
        ]
    return own_check


def _update_side_effect(own_check, data):
    for key, value in data.items():
        setattr(own_check, key, value)
    return own_check


def _make_service(exists_duplicate=False):
    repo = Mock()
    repo.exists_duplicate.return_value = exists_duplicate
    repo.update.side_effect = _update_side_effect
    return OwnCheckService(repo), repo


# ── CREATE ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_duplicado_lanza_excepcion():
    service, repo = _make_service(exists_duplicate=True)

    with pytest.raises(OwnCheckAlreadyExistsException):
        service.create_own_check({
            'numero': 1001,
            'banco': Mock(),
            'importe': Decimal('1000.00'),
            'fecha_emision': '2024-01-01',
            'fecha_vencimiento': '2024-02-01',
        })

    repo.create.assert_not_called()


@pytest.mark.django_db
def test_create_sin_duplicado_crea_cheque():
    service, repo = _make_service(exists_duplicate=False)
    data = {
        'numero': 1001,
        'banco': Mock(),
        'importe': Decimal('1000.00'),
        'fecha_emision': '2024-01-01',
        'fecha_vencimiento': '2024-02-01',
    }

    service.create_own_check(data)

    repo.create.assert_called_once_with(data)


@pytest.mark.django_db
def test_create_fecha_deposito_posterior_a_vencimiento_lanza_excepcion():
    service, repo = _make_service(exists_duplicate=False)

    with pytest.raises(OwnCheckInvalidDateRangeException):
        service.create_own_check({
            'numero': 1001,
            'banco': Mock(),
            'importe': Decimal('1000.00'),
            'fecha_emision': '2024-01-01',
            'fecha_deposito': '2024-03-01',
            'fecha_vencimiento': '2024-02-01',
        })

    repo.create.assert_not_called()


# ── UPDATE ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_numero_actualiza_cheque():
    service, repo = _make_service(exists_duplicate=False)
    own_check = _make_own_check(numero=1001)

    service.update_own_check(own_check, {'numero': 9999})

    assert own_check.numero == 9999


@pytest.mark.django_db
def test_update_numero_duplicado_lanza_excepcion():
    service, repo = _make_service(exists_duplicate=True)
    own_check = _make_own_check(numero=1001)

    with pytest.raises(OwnCheckAlreadyExistsException):
        service.update_own_check(own_check, {'numero': 9999})

    repo.update.assert_not_called()


@pytest.mark.django_db
def test_update_numero_bloqueado_si_ya_usado_en_pago():
    service, repo = _make_service()
    own_check = _make_own_check(numero=1001, used_in_purchase=True, supplier_names=['Proveedor Test'])

    with pytest.raises(OwnCheckEditBlockedException) as exc_info:
        service.update_own_check(own_check, {'numero': 9999})

    assert 'Proveedor Test' in str(exc_info.value)
    repo.update.assert_not_called()


@pytest.mark.django_db
def test_update_banco_bloqueado_si_ya_usado_en_pago():
    service, repo = _make_service()
    own_check = _make_own_check(used_in_purchase=True)

    with pytest.raises(OwnCheckEditBlockedException):
        service.update_own_check(own_check, {'banco': Mock()})


@pytest.mark.django_db
def test_update_importe_bloqueado_si_ya_usado_en_pago():
    service, repo = _make_service()
    own_check = _make_own_check(importe=Decimal('1000.00'), used_in_purchase=True)

    with pytest.raises(OwnCheckEditBlockedException):
        service.update_own_check(own_check, {'importe': Decimal('2000.00')})


@pytest.mark.django_db
def test_update_fecha_permitido_aunque_este_usado_en_pago():
    service, repo = _make_service()
    own_check = _make_own_check(used_in_purchase=True)

    service.update_own_check(own_check, {'fecha_emision': '2024-05-01'})

    assert own_check.fecha_emision == '2024-05-01'


@pytest.mark.django_db
def test_update_observaciones_no_dispara_validacion_de_uso():
    service, repo = _make_service()
    own_check = _make_own_check(used_in_purchase=True)

    service.update_own_check(own_check, {'observaciones': 'nota nueva'})

    assert own_check.observaciones == 'nota nueva'


@pytest.mark.django_db
def test_update_fecha_deposito_posterior_a_vencimiento_lanza_excepcion():
    service, repo = _make_service(exists_duplicate=False)
    own_check = _make_own_check()
    own_check.fecha_vencimiento = '2024-02-01'

    with pytest.raises(OwnCheckInvalidDateRangeException):
        service.update_own_check(own_check, {'fecha_deposito': '2024-03-01'})


# ── CASH ─────────────────────────────────────────────────────────────────────

def _make_own_check_estado(estado=OwnCheck.State.EMITIDO, fecha_deposito=None, has_payments=True):
    own_check = mock_own_check(estado=estado, fecha_deposito=fecha_deposito)
    own_check.pagocompra_set.exists.return_value = has_payments
    return own_check


@pytest.mark.django_db
def test_cash_estado_invalido_lanza_excepcion():
    service, repo = _make_service()
    own_check = _make_own_check_estado(estado=OwnCheck.State.COBRADO)

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.cash_check(own_check)

    repo.update.assert_not_called()


@pytest.mark.django_db
def test_cash_sin_pagos_asociados_lanza_excepcion():
    service, repo = _make_service()
    own_check = _make_own_check_estado(has_payments=False)

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.cash_check(own_check)

    repo.update.assert_not_called()


@pytest.mark.django_db
def test_cash_antes_de_fecha_deposito_lanza_excepcion():
    service, repo = _make_service()
    own_check = _make_own_check_estado(fecha_deposito=date.today() + timedelta(days=5))

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.cash_check(own_check)

    repo.update.assert_not_called()


@pytest.mark.django_db
def test_cash_success_marca_cobrado():
    service, repo = _make_service()
    own_check = _make_own_check_estado(fecha_deposito=date.today() - timedelta(days=1))

    service.cash_check(own_check)

    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.COBRADO})


@pytest.mark.django_db
def test_cash_sin_fecha_deposito_success():
    service, repo = _make_service()
    own_check = _make_own_check_estado(fecha_deposito=None)

    service.cash_check(own_check)

    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.COBRADO})


# ── CANCEL ───────────────────────────────────────────────────────────────────

def _use(payment, importe=None):
    '''Uso del cheque en un pago; por defecto, el pago entero se hizo con este cheque.'''
    return mock_own_check_use(pago_compra=payment, importe=Decimal(importe) if importe else payment.importe_abonado)


class FakeSupplierRepo:
    def __init__(self):
        self.updated = []

    def update_balance(self, supplier):
        self.updated.append(supplier.cuenta_corriente)


class FakePaymentRepo:
    def __init__(self):
        self.deleted = []
        self.updated = []

    def delete(self, payment):
        self.deleted.append(payment)

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        self.updated.append(payment)
        return payment


def _make_service_with_cancel_deps(payments=None, uses=None):
    repo = Mock()
    repo.update.side_effect = _update_side_effect
    repo.get_payment_uses.return_value = uses if uses is not None else [_use(payment) for payment in payments or []]
    payment_repo = FakePaymentRepo()
    supplier_repo = FakeSupplierRepo()
    service = OwnCheckService(repo, payment_repository=payment_repo, supplier_repository=supplier_repo)
    return service, repo, payment_repo, supplier_repo


@pytest.mark.django_db
def test_cancel_estado_invalido_lanza_excepcion():
    service, repo, __, ___ = _make_service_with_cancel_deps()
    own_check = mock_own_check(estado=OwnCheck.State.COBRADO)

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.cancel_check(own_check)

    repo.update.assert_not_called()


@pytest.mark.django_db
def test_cancel_success_revierte_pagos_y_anula():
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    payment = mock_purchase_payment(importe_abonado=Decimal('1000.00'), proveedor=supplier)
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps(payments=[payment])
    own_check = mock_own_check(estado=OwnCheck.State.EMITIDO)

    service.cancel_check(own_check)

    assert supplier.cuenta_corriente == Decimal('6000.00')
    assert payment in payment_repo.deleted
    assert len(supplier_repo.updated) == 1
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})


@pytest.mark.django_db
def test_cancel_success_con_varios_pagos_revierte_todos():
    supplier_a = mock_supplier(cuenta_corriente=Decimal('1000.00'))
    supplier_b = mock_supplier(cuenta_corriente=Decimal('2000.00'))
    payment_a = mock_purchase_payment(importe_abonado=Decimal('300.00'), proveedor=supplier_a)
    payment_b = mock_purchase_payment(importe_abonado=Decimal('200.00'), proveedor=supplier_b)
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps(payments=[payment_a, payment_b])
    own_check = mock_own_check(estado=OwnCheck.State.EMITIDO)

    service.cancel_check(own_check)

    assert supplier_a.cuenta_corriente == Decimal('1300.00')
    assert supplier_b.cuenta_corriente == Decimal('2200.00')
    assert payment_repo.deleted == [payment_a, payment_b]
    assert len(supplier_repo.updated) == 2


@pytest.mark.django_db
def test_cancel_success_sin_pagos_solo_anula():
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps(payments=[])
    own_check = mock_own_check(estado=OwnCheck.State.EMITIDO)

    service.cancel_check(own_check)

    assert payment_repo.deleted == []
    assert supplier_repo.updated == []
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})


@pytest.mark.django_db
def test_cancel_revierte_tambien_pagos_a_cuenta():
    supplier = mock_supplier(cuenta_corriente=Decimal('7577000.00'))
    on_account = mock_purchase_payment(importe_abonado=Decimal('1000000.00'), proveedor=supplier, compra=None)
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps(payments=[on_account])
    own_check = mock_own_check(estado=OwnCheck.State.EMITIDO)

    service.cancel_check(own_check)

    assert supplier.cuenta_corriente == Decimal('8577000.00')
    assert payment_repo.deleted == [on_account]
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})


@pytest.mark.django_db
def test_cancel_pago_con_otros_cheques_solo_descuenta_la_parte_de_este():
    # Pago de $1.000 hecho con este cheque ($400) y otro ($600): queda el pago por $600.
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    payment = mock_purchase_payment(importe_abonado=Decimal('1000.00'), proveedor=supplier)
    use = _use(payment, importe='400.00')
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps(uses=[use])
    own_check = mock_own_check(estado=OwnCheck.State.EMITIDO)

    service.cancel_check(own_check)

    assert supplier.cuenta_corriente == Decimal('5400.00')
    assert payment.importe_abonado == Decimal('600.00')
    assert payment_repo.deleted == []
    repo.delete_payment_use.assert_called_once_with(use)
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})
