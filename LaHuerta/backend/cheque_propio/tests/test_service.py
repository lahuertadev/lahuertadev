import datetime
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
from core.tests.mocks import (
    mock_own_check, mock_purchase, mock_purchase_application, mock_purchase_payment, mock_supplier,
)


def _make_own_check(numero=1001, importe=Decimal('1000.00'), used_in_purchase=False, payment_state='VIGENTE'):
    '''Cheque emitido; con used_in_purchase, usado en un pago (cheque_propio.pago_compra).'''
    payment = (
        mock_purchase_payment(id=120, proveedor=mock_supplier(nombre='Proveedor Test'), estado_pago=payment_state)
        if used_in_purchase else None
    )
    return mock_own_check(id=1, numero=numero, importe=importe, fecha_vencimiento=None, pago_compra=payment)


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
    own_check = _make_own_check(numero=1001, used_in_purchase=True)

    with pytest.raises(OwnCheckEditBlockedException) as exc_info:
        service.update_own_check(own_check, {'numero': 9999})

    assert 'pago N° 00000120 a Proveedor Test' in str(exc_info.value)
    repo.update.assert_not_called()


@pytest.mark.django_db
def test_update_importe_permitido_si_su_pago_esta_anulado():
    # Al anular el pago el cheque queda libre: se puede corregir.
    service, repo = _make_service()
    own_check = _make_own_check(used_in_purchase=True, payment_state='ANULADO')

    service.update_own_check(own_check, {'importe': Decimal('2000.00')})

    assert own_check.importe == Decimal('2000.00')


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
    payment = mock_purchase_payment() if has_payments else None
    return mock_own_check(estado=estado, fecha_deposito=fecha_deposito, pago_compra=payment)


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

class FakeSupplierRepo:
    def __init__(self):
        self.updated = []

    def update_balance(self, supplier):
        self.updated.append(supplier.cuenta_corriente)


class FakePaymentRepo:
    def __init__(self):
        self.updated = []

    def get_purchase_applications_newest_first(self, payment):
        return sorted(
            payment.purchase_applications.all(),
            key=lambda application: (application.compra.fecha, application.compra.id),
            reverse=True,
        )

    def update_purchase_application(self, application, amount):
        application.importe = amount

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        self.updated.append(payment)
        return payment


def _payment_with_purchases(supplier, amount, purchases):
    '''Pago que cubre las compras indicadas: [(compra, importe aplicado)].'''
    payment = mock_purchase_payment(importe_abonado=amount, proveedor=supplier, compra=None)
    payment.purchase_applications.all.return_value = [
        mock_purchase_application(pago_compra=payment, compra=buy, importe=applied) for buy, applied in purchases
    ]
    return payment


def _applied(payment):
    return [(application.compra, application.importe) for application in payment.purchase_applications.all()]


def _check_in(payment, state=OwnCheck.State.EMITIDO, importe=None):
    '''Cheque emitido usado en el pago; por defecto, el pago entero se hizo con este cheque.'''
    return mock_own_check(
        estado=state, pago_compra=payment, importe=Decimal(importe) if importe else payment.importe_abonado,
    )


def _make_service_with_cancel_deps():
    repo = Mock()
    repo.update.side_effect = _update_side_effect
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
def test_cancel_devuelve_la_deuda_y_deja_el_pago_en_cero_sin_eliminarlo():
    # Igual que el rechazo: el pago hecho solo con este cheque queda en cero, con el cheque
    # anulado vinculado como registro.
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    buy = mock_purchase(proveedor=supplier)
    payment = _payment_with_purchases(supplier, Decimal('1000.00'), [(buy, Decimal('1000.00'))])
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()
    own_check = _check_in(payment)

    service.cancel_check(own_check)

    assert supplier.cuenta_corriente == Decimal('6000.00')
    assert payment.importe_abonado == Decimal('0.00')
    assert _applied(payment) == [(buy, Decimal('0.00'))]
    assert len(supplier_repo.updated) == 1
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})
    assert own_check.pago_compra is payment


@pytest.mark.django_db
def test_cancel_success_sin_pago_solo_anula():
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()
    own_check = mock_own_check(estado=OwnCheck.State.EMITIDO)

    service.cancel_check(own_check)

    assert payment_repo.updated == []
    assert supplier_repo.updated == []
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})


@pytest.mark.django_db
def test_cancel_con_su_pago_anulado_no_devuelve_la_deuda_otra_vez():
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    payment = mock_purchase_payment(importe_abonado=Decimal('1000.00'), proveedor=supplier, estado_pago='ANULADO')
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()

    service.cancel_check(_check_in(payment))

    assert supplier.cuenta_corriente == Decimal('5000.00')
    assert payment.importe_abonado == Decimal('1000.00')
    assert supplier_repo.updated == []


@pytest.mark.django_db
def test_cancel_revierte_tambien_pagos_a_cuenta():
    supplier = mock_supplier(cuenta_corriente=Decimal('7577000.00'))
    on_account = mock_purchase_payment(importe_abonado=Decimal('1000000.00'), proveedor=supplier, compra=None)
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()
    own_check = _check_in(on_account)

    service.cancel_check(own_check)

    assert supplier.cuenta_corriente == Decimal('8577000.00')
    assert on_account.importe_abonado == Decimal('0.00')
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})


@pytest.mark.django_db
def test_cancel_pago_con_otros_cheques_solo_descuenta_la_parte_de_este():
    # Pago de $1.000 hecho con este cheque ($400) y otro ($600): queda el pago por $600.
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    payment = mock_purchase_payment(importe_abonado=Decimal('1000.00'), proveedor=supplier)
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()
    own_check = _check_in(payment, importe='400.00')

    service.cancel_check(own_check)

    assert supplier.cuenta_corriente == Decimal('5400.00')
    assert payment.importe_abonado == Decimal('600.00')
    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.ANULADO})


@pytest.mark.django_db
def test_cancel_pago_con_otros_cheques_descuenta_de_la_compra_mas_nueva():
    # Pago de $1.000 (este cheque $400 y otro $600) que cubre dos compras de $500.
    supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
    older = mock_purchase(id=1, fecha=datetime.date(2026, 1, 10), proveedor=supplier)
    newer = mock_purchase(id=2, fecha=datetime.date(2026, 2, 10), proveedor=supplier)
    payment = _payment_with_purchases(supplier, Decimal('1000.00'), [(older, Decimal('500.00')), (newer, Decimal('500.00'))])
    service, repo, payment_repo, _ = _make_service_with_cancel_deps()

    service.cancel_check(_check_in(payment, importe='400.00'))

    assert _applied(payment) == [(older, Decimal('500.00')), (newer, Decimal('100.00'))]
    assert payment.importe_abonado == Decimal('600.00')


# ── REJECT ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@pytest.mark.parametrize('state', [OwnCheck.State.EMITIDO, OwnCheck.State.COBRADO])
def test_reject_desde_emitido_o_cobrado(state):
    supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
    payment = mock_purchase_payment(importe_abonado=Decimal('1000.00'), proveedor=supplier)
    service, repo, _, __ = _make_service_with_cancel_deps()
    own_check = _check_in(payment, state=state)

    service.reject_check(own_check)

    repo.update.assert_called_once_with(own_check, {'estado': OwnCheck.State.RECHAZADO})


@pytest.mark.django_db
@pytest.mark.parametrize('state', [OwnCheck.State.ANULADO, OwnCheck.State.RECHAZADO])
def test_reject_estado_invalido_lanza_excepcion(state):
    payment = mock_purchase_payment()
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.reject_check(_check_in(payment, state=state))

    repo.update.assert_not_called()
    assert supplier_repo.updated == []


@pytest.mark.django_db
def test_reject_sin_pago_lanza_excepcion():
    service, repo, _, __ = _make_service_with_cancel_deps()

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.reject_check(mock_own_check(estado=OwnCheck.State.EMITIDO))

    repo.update.assert_not_called()


@pytest.mark.django_db
def test_reject_con_su_pago_anulado_lanza_excepcion():
    payment = mock_purchase_payment(estado_pago='ANULADO')
    service, repo, _, supplier_repo = _make_service_with_cancel_deps()

    with pytest.raises(OwnCheckInvalidTransitionException):
        service.reject_check(_check_in(payment))

    repo.update.assert_not_called()
    assert supplier_repo.updated == []


@pytest.mark.django_db
def test_reject_devuelve_la_deuda_y_deja_el_pago_en_cero_sin_eliminarlo():
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    buy = mock_purchase(proveedor=supplier)
    payment = _payment_with_purchases(supplier, Decimal('1000.00'), [(buy, Decimal('1000.00'))])
    service, repo, payment_repo, supplier_repo = _make_service_with_cancel_deps()
    own_check = _check_in(payment)

    service.reject_check(own_check)

    assert supplier.cuenta_corriente == Decimal('6000.00')
    assert payment.importe_abonado == Decimal('0.00')
    assert _applied(payment) == [(buy, Decimal('0.00'))]
    # El cheque sigue vinculado al pago: es el registro del cheque rechazado.
    assert own_check.pago_compra is payment


@pytest.mark.django_db
def test_reject_pago_con_otros_cheques_descuenta_solo_su_parte_desde_la_compra_mas_nueva():
    supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
    older = mock_purchase(id=1, fecha=datetime.date(2026, 1, 10), proveedor=supplier)
    newer = mock_purchase(id=2, fecha=datetime.date(2026, 2, 10), proveedor=supplier)
    payment = _payment_with_purchases(supplier, Decimal('3000.00'), [(older, Decimal('1000.00')), (newer, Decimal('2000.00'))])
    service, _, __, ___ = _make_service_with_cancel_deps()

    service.reject_check(_check_in(payment, state=OwnCheck.State.COBRADO, importe='2500.00'))

    assert supplier.cuenta_corriente == Decimal('2500.00')
    assert payment.importe_abonado == Decimal('500.00')
    assert _applied(payment) == [(older, Decimal('500.00')), (newer, Decimal('0.00'))]
