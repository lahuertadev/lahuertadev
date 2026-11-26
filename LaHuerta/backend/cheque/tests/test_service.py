import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from cheque.service import CheckService
from cheque.exceptions import CheckAlreadyEndorsedException, CheckInvalidStateException, CheckInvalidTransitionException
from cliente.interfaces import IClientRepository
from core.tests.factories import make_check_state
from core.tests.mocks import (
    mock_check, mock_check_state, mock_client, mock_client_payment, mock_purchase, mock_purchase_payment, mock_supplier,
)


def _make_check(endosado=False, estado_descripcion='EN_CARTERA', pago_cliente=None, pago_compra=None, importe='2000.00'):
    return mock_check(
        importe=Decimal(importe),
        endosado=endosado,
        estado=mock_check_state(descripcion=estado_descripcion),
        pago_cliente=pago_cliente,
        pago_compra=pago_compra,
    )


class FakeClientRepo(IClientRepository):
    def __init__(self):
        self.updated = []

    def get_all_clients(self, cuit=None, searchQuery=None, address=None): pass
    def get_client_by_id(self, id): pass
    def get_client_by_cuit(self, cuit): pass
    def create_client(self, data): pass
    def modify_client(self, client, data): pass
    def delete_client(self, client): pass

    def update_balance(self, client):
        self.updated.append(client.cuenta_corriente)


class FakeSupplierRepo:
    def __init__(self):
        self.updated = []

    def update_balance(self, supplier):
        self.updated.append(supplier.cuenta_corriente)


class FakePaymentRepo:
    '''Lo que usa reduce_payment_amount: las compras del pago (de la más nueva a la más vieja) y su importe.'''
    def __init__(self):
        self.deleted = []

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
        return payment

    def delete(self, payment):
        self.deleted.append(payment)


class FakeClientPaymentRepo:
    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        return payment


def _make_service(with_client_repo=False, with_supplier_repo=False):
    repo = Mock()
    repo.update.side_effect = lambda check, data: [setattr(check, k, v) for k, v in data.items()]
    client_repo = FakeClientRepo() if with_client_repo else None
    supplier_repo = FakeSupplierRepo() if with_supplier_repo else None
    service = CheckService(
        repo, client_repository=client_repo, supplier_repository=supplier_repo, payment_repository=FakePaymentRepo(),
        client_payment_repository=FakeClientPaymentRepo(),
    )
    return service, repo, client_repo, supplier_repo


# ── ENDORSE ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_endorse_already_endorsed():
    service, _, __, ___ = _make_service()
    check = _make_check(endosado=True)
    with pytest.raises(CheckAlreadyEndorsedException):
        service.endorse_check(check, pago_compra=Mock())


@pytest.mark.django_db
def test_endorse_invalid_state():
    service, _, __, ___ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')
    with pytest.raises(CheckInvalidStateException):
        service.endorse_check(check, pago_compra=Mock())


def test_endorse_cheque_de_un_pago_de_cliente_anulado_lanza_excepcion():
    service, repo, _, __ = _make_service()
    check = _make_check(estado_descripcion='ANULADO')
    with pytest.raises(CheckInvalidStateException):
        service.endorse_check(check, pago_compra=Mock())
    repo.update.assert_not_called()


@pytest.mark.django_db
def test_endorse_success():
    make_check_state(descripcion='ENDOSADO')
    service, repo, _, __ = _make_service()
    pago_compra = Mock()
    check = _make_check()

    result = service.endorse_check(check, pago_compra)

    assert result.endosado is True
    assert result.fecha_endoso == date.today()
    assert result.pago_compra is pago_compra
    repo.update.assert_called_once()


# ── DEPOSIT ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_deposit_invalid_state():
    service, _, __, ___ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')
    with pytest.raises(CheckInvalidTransitionException):
        service.deposit_check(check)


def test_deposit_cheque_de_un_pago_de_cliente_anulado_lanza_excepcion():
    service, repo, _, __ = _make_service()
    check = _make_check(estado_descripcion='ANULADO')
    with pytest.raises(CheckInvalidTransitionException):
        service.deposit_check(check)
    repo.update.assert_not_called()


@pytest.mark.django_db
def test_deposit_success():
    make_check_state(descripcion='DEPOSITADO')
    service, repo, _, __ = _make_service()
    check = _make_check()  # EN_CARTERA

    result = service.deposit_check(check)

    assert result.estado.descripcion == 'DEPOSITADO'
    repo.update.assert_called_once()


# ── CREDIT ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_credit_invalid_state():
    service, _, __, ___ = _make_service()
    check = _make_check(estado_descripcion='EN_CARTERA')
    with pytest.raises(CheckInvalidTransitionException):
        service.credit_check(check)


@pytest.mark.django_db
def test_credit_success():
    make_check_state(descripcion='ACREDITADO')
    service, repo, _, __ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')

    result = service.credit_check(check)

    assert result.estado.descripcion == 'ACREDITADO'
    repo.update.assert_called_once()


# ── REJECT ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_reject_invalid_state():
    service, _, __, ___ = _make_service()
    check = _make_check(estado_descripcion='EN_CARTERA')
    with pytest.raises(CheckInvalidTransitionException):
        service.reject_check(check)


@pytest.mark.django_db
def test_reject_success():
    make_check_state(descripcion='RECHAZADO')
    service, repo, _, __ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')

    result = service.reject_check(check)

    assert result.estado.descripcion == 'RECHAZADO'
    repo.update.assert_called_once()


@pytest.mark.django_db
def test_reject_con_pago_cliente_revierte_cc_y_anula_el_pago():
    make_check_state(descripcion='RECHAZADO')
    service, _, client_repo, __ = _make_service(with_client_repo=True)
    client = mock_client(cuenta_corriente=Decimal('3000.00'))
    check = _make_check(estado_descripcion='DEPOSITADO')
    pago_cliente = mock_client_payment(importe=Decimal('2000.00'), cliente=client, cheques=[check])

    service.reject_check(check)

    assert client.cuenta_corriente == Decimal('5000.00')
    assert len(client_repo.updated) == 1
    assert pago_cliente.estado_pago == 'ANULADO'
    assert pago_cliente.motivo_anulacion == f'Cheque rechazado: N° {check.numero}'


@pytest.mark.django_db
def test_reject_de_uno_de_varios_cheques_del_pago_de_cliente_devuelve_solo_su_importe():
    make_check_state(descripcion='RECHAZADO')
    service, _, __, ___ = _make_service(with_client_repo=True)
    client = mock_client(cuenta_corriente=Decimal('0.00'))
    rejected = _make_check(estado_descripcion='DEPOSITADO', importe='1000.00')
    other = _make_check(estado_descripcion='EN_CARTERA', importe='2500.00')
    pago_cliente = mock_client_payment(importe=Decimal('3500.00'), cliente=client, cheques=[rejected, other])

    service.reject_check(rejected)

    assert client.cuenta_corriente == Decimal('1000.00')
    assert pago_cliente.importe == Decimal('2500.00')
    assert pago_cliente.estado_pago == 'VIGENTE'


@pytest.mark.django_db
def test_reject_sin_pago_cliente_no_modifica_cc():
    make_check_state(descripcion='RECHAZADO')
    service, _, client_repo, __ = _make_service(with_client_repo=True)
    check = _make_check(estado_descripcion='DEPOSITADO', pago_cliente=None)

    service.reject_check(check)

    assert len(client_repo.updated) == 0


# ── CREDIT / REJECT desde ENDOSADO ────────────────────────────────────────────

@pytest.mark.django_db
def test_credit_success_desde_endosado():
    make_check_state(descripcion='ACREDITADO')
    service, repo, _, __ = _make_service()
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO')

    result = service.credit_check(check)

    assert result.estado.descripcion == 'ACREDITADO'
    repo.update.assert_called_once()


@pytest.mark.django_db
def test_reject_success_desde_endosado():
    make_check_state(descripcion='RECHAZADO')
    service, repo, _, __ = _make_service()
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO')

    result = service.reject_check(check)

    assert result.estado.descripcion == 'RECHAZADO'
    repo.update.assert_called_once()


@pytest.mark.django_db
def test_reject_desde_endosado_revierte_cc_cliente_y_proveedor():
    make_check_state(descripcion='RECHAZADO')
    service, _, client_repo, supplier_repo = _make_service(with_client_repo=True, with_supplier_repo=True)
    client = mock_client(cuenta_corriente=Decimal('3000.00'))
    supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
    pago_compra = mock_purchase_payment(importe_abonado=Decimal('2000.00'), proveedor=supplier)
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO', pago_compra=pago_compra)
    mock_client_payment(importe=Decimal('2000.00'), cliente=client, cheques=[check])

    service.reject_check(check)

    assert client.cuenta_corriente == Decimal('5000.00')
    assert supplier.cuenta_corriente == Decimal('7000.00')
    assert len(client_repo.updated) == 1
    assert len(supplier_repo.updated) == 1


@pytest.mark.django_db
def test_reject_desde_depositado_no_revierte_cc_proveedor():
    make_check_state(descripcion='RECHAZADO')
    service, _, __, supplier_repo = _make_service(with_supplier_repo=True)
    check = _make_check(endosado=False, estado_descripcion='DEPOSITADO', pago_compra=None)

    service.reject_check(check)

    assert len(supplier_repo.updated) == 0


@pytest.mark.django_db
def test_reject_cheque_de_un_pago_con_varios_cheques_devuelve_solo_su_importe():
    # Pago de $5.000 hecho con dos cheques ($2.000 y $3.000): se rechaza el de $2.000.
    make_check_state(descripcion='RECHAZADO')
    service, _, __, supplier_repo = _make_service(with_supplier_repo=True)
    supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))
    pago_compra = mock_purchase_payment(importe_abonado=Decimal('5000.00'), proveedor=supplier)
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO', pago_compra=pago_compra, importe='2000.00')

    service.reject_check(check)

    assert supplier.cuenta_corriente == Decimal('3000.00')
    assert len(supplier_repo.updated) == 1


@pytest.mark.django_db
def test_reject_baja_el_importe_del_pago_y_lo_descuenta_de_la_compra():
    # Pago de $5.000 con dos cheques que cubre una compra de $5.000: se rechaza el de $2.000.
    make_check_state(descripcion='RECHAZADO')
    service, _, __, ___ = _make_service(with_supplier_repo=True)
    buy = mock_purchase(importe=Decimal('5000.00'))
    pago_compra = mock_purchase_payment(importe_abonado=Decimal('5000.00'), compra=buy)
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO', pago_compra=pago_compra, importe='2000.00')

    service.reject_check(check)

    assert pago_compra.importe_abonado == Decimal('3000.00')
    application = pago_compra.purchase_applications.all()[0]
    assert application.importe == Decimal('3000.00')


@pytest.mark.django_db
def test_reject_descuenta_primero_de_la_compra_mas_nueva_del_pago():
    make_check_state(descripcion='RECHAZADO')
    service, _, __, ___ = _make_service(with_supplier_repo=True)
    supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
    older = mock_purchase(id=1, fecha=date(2026, 1, 10), proveedor=supplier)
    newer = mock_purchase(id=2, fecha=date(2026, 2, 10), proveedor=supplier)
    pago_compra = mock_purchase_payment(importe_abonado=Decimal('3000.00'), compra=older, proveedor=supplier)
    first = pago_compra.purchase_applications.all()[0]
    first.importe = Decimal('1000.00')
    second = mock_purchase_payment(compra=newer, proveedor=supplier, importe_abonado=Decimal('2000.00')).purchase_applications.all()[0]
    pago_compra.purchase_applications.all.return_value = [first, second]
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO', pago_compra=pago_compra, importe='2500.00')

    service.reject_check(check)

    assert second.importe == Decimal('0.00')
    assert first.importe == Decimal('500.00')
    assert pago_compra.importe_abonado == Decimal('500.00')
    assert supplier.cuenta_corriente == Decimal('2500.00')


@pytest.mark.django_db
def test_reject_del_unico_cheque_deja_el_pago_en_cero_sin_eliminarlo():
    make_check_state(descripcion='RECHAZADO')
    service, repo, _, __ = _make_service(with_supplier_repo=True)
    pago_compra = mock_purchase_payment(importe_abonado=Decimal('2000.00'))
    check = _make_check(endosado=True, estado_descripcion='ENDOSADO', pago_compra=pago_compra, importe='2000.00')

    service.reject_check(check)

    assert pago_compra.importe_abonado == Decimal('0.00')
    assert service.payment_repository.deleted == []
    # El cheque rechazado sigue en el pago, como registro de lo que pasó.
    assert 'pago_compra' not in repo.update.call_args[0][1]
    assert check.pago_compra is pago_compra


@pytest.mark.django_db
def test_reject_desde_depositado_no_toca_ningun_pago():
    make_check_state(descripcion='RECHAZADO')
    service, _, __, ___ = _make_service(with_supplier_repo=True)
    pago_compra = mock_purchase_payment(importe_abonado=Decimal('2000.00'))
    # Un cheque depositado no está endosado: aunque tenga pago, no se toca.
    check = _make_check(endosado=False, estado_descripcion='DEPOSITADO', pago_compra=pago_compra)

    service.reject_check(check)

    assert pago_compra.importe_abonado == Decimal('2000.00')
