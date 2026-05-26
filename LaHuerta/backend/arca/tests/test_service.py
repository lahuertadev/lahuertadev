import pytest
import json
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock

from arca.service import ARCAService
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_service():
    return ARCAService(homologacion=True)


def _valid_token_cache(tmp_path):
    expiry = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    cache = tmp_path / "token_homo.json"
    cache.write_text(json.dumps({"token": "tok", "sign": "sig", "expiry": expiry}))
    return cache


def _expired_token_cache(tmp_path):
    expiry = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    cache = tmp_path / "token_homo.json"
    cache.write_text(json.dumps({"token": "old", "sign": "old", "expiry": expiry}))
    return cache


# ── _load_cached_token ─────────────────────────────────────────────────────────

def test_load_cached_token_no_file(tmp_path):
    service = _make_service()
    service.token_cache_path = str(tmp_path / "nonexistent.json")
    assert service._load_cached_token() is False


def test_load_cached_token_valid(tmp_path):
    cache = _valid_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)

    result = service._load_cached_token()

    assert result is True
    assert service._token == "tok"
    assert service._sign == "sig"


def test_load_cached_token_expired(tmp_path):
    cache = _expired_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)

    result = service._load_cached_token()

    assert result is False


def test_load_cached_token_invalid_json(tmp_path):
    cache = tmp_path / "token_homo.json"
    cache.write_text("not-json")
    service = _make_service()
    service.token_cache_path = str(cache)

    assert service._load_cached_token() is False


# ── _save_token_cache ──────────────────────────────────────────────────────────

def test_save_token_cache_writes_file(tmp_path):
    service = _make_service()
    service._token = "mytoken"
    service._sign = "mysign"
    service.token_cache_path = str(tmp_path / "token_homo.json")

    service._save_token_cache("2026-06-01T10:00:00.000000+0000")

    data = json.loads(Path(service.token_cache_path).read_text())
    assert data["token"] == "mytoken"
    assert data["sign"] == "mysign"
    assert "expiry" in data


def test_save_token_cache_invalid_format_does_not_raise(tmp_path):
    service = _make_service()
    service.token_cache_path = str(tmp_path / "token_homo.json")
    service._save_token_cache("invalid-date-format")


# ── _authenticate ──────────────────────────────────────────────────────────────

def test_authenticate_uses_cache_when_valid(tmp_path):
    cache = _valid_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)

    with patch("arca.service.WSAA") as MockWSAA:
        service._authenticate()
        MockWSAA.assert_not_called()

    assert service._token == "tok"


def test_authenticate_calls_wsaa_when_no_cache(tmp_path):
    service = _make_service()
    service.token_cache_path = str(tmp_path / "token_homo.json")

    mock_wsaa = Mock()
    mock_wsaa.ObtenerTagXml.side_effect = lambda tag: {
        "token": "new_tok", "sign": "new_sig", "expirationTime": "2026-06-01T10:00:00.000000+0000"
    }[tag]

    with patch("arca.service.WSAA", return_value=mock_wsaa):
        service._authenticate()

    assert service._token == "new_tok"
    assert service._sign == "new_sig"


def test_authenticate_already_authenticated_raises(tmp_path):
    service = _make_service()
    service.token_cache_path = str(tmp_path / "token_homo.json")

    mock_wsaa = Mock()
    mock_wsaa.CallWSAA.side_effect = Exception("alreadyAuthenticated error")

    with patch("arca.service.WSAA", return_value=mock_wsaa):
        with pytest.raises(WSAAAuthenticationError) as exc:
            service._authenticate()

    assert "token válido" in str(exc.value)


def test_authenticate_generic_error_raises(tmp_path):
    service = _make_service()
    service.token_cache_path = str(tmp_path / "token_homo.json")

    mock_wsaa = Mock()
    mock_wsaa.CallWSAA.side_effect = Exception("connection refused")

    with patch("arca.service.WSAA", return_value=mock_wsaa):
        with pytest.raises(WSAAAuthenticationError) as exc:
            service._authenticate()

    assert "WSAA" in str(exc.value)


# ── emit_receipt ───────────────────────────────────────────────────────────────

def _make_wsfe_mock(resultado="A", cae="12345678901234", vencimiento="20260601"):
    wsfe = Mock()
    wsfe.CompUltimoAutorizado.return_value = "4"
    wsfe.Resultado = resultado
    wsfe.CAE = cae
    wsfe.Vencimiento = vencimiento
    wsfe.Obs = ""
    wsfe.ErrMsg = ""
    return wsfe


def test_emit_receipt_ok(tmp_path):
    cache = _valid_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)
    service._token = "tok"
    service._sign = "sig"

    wsfe_mock = _make_wsfe_mock()

    with patch("arca.service.WSFEv1", return_value=wsfe_mock):
        result = service.emit_receipt(
            tipo_cbte=1,
            importe=11050.0,
            fecha=date(2026, 5, 7),
            cuit_receptor="20123456789",
            condicion_iva_receptor_id=1,
        )

    assert result["numero_comprobante"] == 5
    assert result["cae"] == "12345678901234"
    assert result["cae_vto"] == date(2026, 6, 1)
    wsfe_mock.CAESolicitar.assert_called_once()


def test_emit_receipt_rechazado_raises(tmp_path):
    cache = _valid_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)
    service._token = "tok"
    service._sign = "sig"

    wsfe_mock = _make_wsfe_mock(resultado="R")

    with patch("arca.service.WSFEv1", return_value=wsfe_mock):
        with pytest.raises(WSFEEmissionError):
            service.emit_receipt(
                tipo_cbte=1,
                importe=11050.0,
                fecha=date(2026, 5, 7),
                cuit_receptor="20123456789",
                condicion_iva_receptor_id=1,
            )


def test_emit_receipt_wsfe_exception_raises(tmp_path):
    cache = _valid_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)
    service._token = "tok"
    service._sign = "sig"

    wsfe_mock = Mock()
    wsfe_mock.CompUltimoAutorizado.side_effect = Exception("conexión fallida")

    with patch("arca.service.WSFEv1", return_value=wsfe_mock):
        with pytest.raises(WSFEEmissionError):
            service.emit_receipt(
                tipo_cbte=1,
                importe=11050.0,
                fecha=date(2026, 5, 7),
                cuit_receptor="20123456789",
                condicion_iva_receptor_id=1,
            )


def test_emit_receipt_calcula_importes_correctamente(tmp_path):
    cache = _valid_token_cache(tmp_path)
    service = _make_service()
    service.token_cache_path = str(cache)
    service._token = "tok"
    service._sign = "sig"

    wsfe_mock = _make_wsfe_mock()

    with patch("arca.service.WSFEv1", return_value=wsfe_mock):
        service.emit_receipt(
            tipo_cbte=1,
            importe=11050.0,
            fecha=date(2026, 5, 7),
            cuit_receptor="20123456789",
            condicion_iva_receptor_id=1,
        )

    call_kwargs = wsfe_mock.CrearFactura.call_args[1]
    assert call_kwargs["imp_total"] == 11050.0
    assert abs(call_kwargs["imp_neto"] - round(11050.0 / 1.105, 2)) < 0.01
    assert abs(call_kwargs["imp_iva"] - round(11050.0 - round(11050.0 / 1.105, 2), 2)) < 0.01
