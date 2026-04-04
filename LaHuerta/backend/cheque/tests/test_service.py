import pytest
from datetime import date
from unittest.mock import Mock

from estado_cheque.models import EstadoCheque
from cheque.service import CheckService
from cheque.exceptions import CheckAlreadyEndorsedException, CheckInvalidStateException


def _make_check(endosado=False, estado_descripcion='EN_CARTERA'):
    estado = Mock()
    estado.descripcion = estado_descripcion
    check = Mock()
    check.endosado = endosado
    check.estado = estado
    return check


def _make_service():
    repo = Mock()
    repo.update.side_effect = lambda check, data: [setattr(check, k, v) for k, v in data.items()]
    return CheckService(repo), repo


# ── ENDORSE ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_endorse_already_endorsed():
    service, _ = _make_service()
    check = _make_check(endosado=True)
    with pytest.raises(CheckAlreadyEndorsedException):
        service.endorse_check(check, pago_compra=Mock())


@pytest.mark.django_db
def test_endorse_invalid_state():
    service, _ = _make_service()
    check = _make_check(estado_descripcion='DEPOSITADO')
    with pytest.raises(CheckInvalidStateException):
        service.endorse_check(check, pago_compra=Mock())


@pytest.mark.django_db
def test_endorse_success():
    EstadoCheque.objects.create(descripcion='ENDOSADO')
    service, repo = _make_service()
    pago_compra = Mock()
    check = _make_check()

    result = service.endorse_check(check, pago_compra)

    assert result.endosado is True
    assert result.fecha_endoso == date.today()
    assert result.pago_compra is pago_compra
    repo.update.assert_called_once()
