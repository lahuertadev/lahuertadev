import pytest
from decimal import Decimal
from unittest.mock import Mock

from cheque_propio.service import OwnCheckService
from cheque_propio.exceptions import (
    OwnCheckAlreadyExistsException,
    OwnCheckEditBlockedException,
    OwnCheckInvalidDateRangeException,
)


def _make_own_check(numero=1001, banco=None, importe=Decimal('1000.00'), used_in_purchase=False, supplier_names=None):
    own_check = Mock()
    own_check.id = 1
    own_check.numero = numero
    own_check.banco = banco or Mock()
    own_check.importe = importe
    own_check.fecha_deposito = None
    own_check.fecha_vencimiento = None

    pagocompra_qs = Mock()
    pagocompra_qs.exists.return_value = used_in_purchase
    if used_in_purchase:
        payments = []
        for name in (supplier_names or ['Proveedor Test']):
            payment = Mock()
            payment.compra.proveedor.nombre = name
            payments.append(payment)
        pagocompra_qs.select_related.return_value = payments
    own_check.pagocompra_set = pagocompra_qs
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
