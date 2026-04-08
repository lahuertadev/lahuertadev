import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from estado_cheque.models import EstadoCheque
from cheque.service import CheckService
from cheque.exceptions import CheckAlreadyEndorsedException, CheckInvalidStateException, CheckInvalidTransitionException
from cliente.interfaces import IClientRepository


def _make_check(endosado=False, estado_descripcion='EN_CARTERA', pago_cliente=None):
    estado = Mock()
    estado.descripcion = estado_descripcion
    check = Mock()
    check.endosado = endosado
    check.estado = estado
    check.pago_cliente = pago_cliente
    return check


def _make_pago_cliente(importe='2000.00', cc='5000.00'):
    cliente = Mock()
    cliente.cuenta_corriente = Decimal(cc)
    pago = Mock()
    pago.importe = Decimal(importe)
    pago.cliente = cliente
    return pago


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


def _make_service(with_client_repo=False):
    repo = Mock()
    repo.update.side_effect = lambda check, data: [setattr(check, k, v) for k, v in data.items()]
    client_repo = FakeClientRepo() if with_client_repo else None
    return CheckService(repo, client_repository=client_repo), repo, client_repo


# ── ENDORSE ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_endorse_already_endorsed():
    service, _, __ = _make_service()
    check = _make_check(endosado=True)
    with pytest.raises(CheckAlreadyEndorsedException):
        service.endorse_check(check, pago_compra=Mock())


@pytest.mark.django_db
def test_endorse_invalid_state():
    service, _, __ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')
    with pytest.raises(CheckInvalidStateException):
        service.endorse_check(check, pago_compra=Mock())


@pytest.mark.django_db
def test_endorse_success():
    EstadoCheque.objects.create(descripcion='ENDOSADO')
    service, repo, _ = _make_service()
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
    service, _, __ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')
    with pytest.raises(CheckInvalidTransitionException):
        service.deposit_check(check)


@pytest.mark.django_db
def test_deposit_success():
    EstadoCheque.objects.create(descripcion='DEPOSITADO')
    service, repo, _ = _make_service()
    check = _make_check()  # EN_CARTERA

    result = service.deposit_check(check)

    assert result.estado.descripcion == 'DEPOSITADO'
    repo.update.assert_called_once()


# ── CREDIT ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_credit_invalid_state():
    service, _, __ = _make_service()
    check = _make_check(estado_descripcion='EN_CARTERA')
    with pytest.raises(CheckInvalidTransitionException):
        service.credit_check(check)


@pytest.mark.django_db
def test_credit_success():
    EstadoCheque.objects.create(descripcion='ACREDITADO')
    service, repo, _ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')

    result = service.credit_check(check)

    assert result.estado.descripcion == 'ACREDITADO'
    repo.update.assert_called_once()


# ── REJECT ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_reject_invalid_state():
    service, _, __ = _make_service()
    check = _make_check(estado_descripcion='EN_CARTERA')
    with pytest.raises(CheckInvalidTransitionException):
        service.reject_check(check)


@pytest.mark.django_db
def test_reject_success():
    EstadoCheque.objects.create(descripcion='RECHAZADO')
    service, repo, _ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')

    result = service.reject_check(check)

    assert result.estado.descripcion == 'RECHAZADO'
    repo.update.assert_called_once()


@pytest.mark.django_db
def test_reject_con_pago_cliente_revierte_cc():
    EstadoCheque.objects.create(descripcion='RECHAZADO')
    service, _, client_repo = _make_service(with_client_repo=True)
    pago_cliente = _make_pago_cliente(importe='2000.00', cc='3000.00')
    check = _make_check(estado_descripcion='DEPOSITADO', pago_cliente=pago_cliente)

    service.reject_check(check)

    assert pago_cliente.cliente.cuenta_corriente == Decimal('5000.00')
    assert len(client_repo.updated) == 1


@pytest.mark.django_db
def test_reject_sin_pago_cliente_no_modifica_cc():
    EstadoCheque.objects.create(descripcion='RECHAZADO')
    service, _, client_repo = _make_service(with_client_repo=True)
    check = _make_check(estado_descripcion='DEPOSITADO', pago_cliente=None)

    service.reject_check(check)

    assert len(client_repo.updated) == 0
