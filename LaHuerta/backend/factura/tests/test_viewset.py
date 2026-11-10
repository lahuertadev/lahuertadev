import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock, MagicMock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser


from factura.views import BillViewSet
from factura.interfaces import IBillRepository
from factura.exceptions import (
    BillNotFoundException, BillHasPaymentsException,
    BillAlreadyEmittedException, PriceNotFoundError, DebitNoteValidationError,
)
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError
from core.tests.factories import make_bill_type, make_client, make_price_list, make_product, make_sale_type, make_vat_condition
from core.tests.mocks import mock_bill


def _mock_bill_without_products(**fields):
    bill = mock_bill(**fields)
    bill.facturaproducto_set = MagicMock()
    bill.facturaproducto_set.__iter__ = Mock(return_value=iter([]))
    bill.facturaproducto_set.all.return_value = []
    return bill


# ── Fake repository ────────────────────────────────────────────────────────────

class FakeBillRepo(IBillRepository):
    def __init__(self):
        self._items = {}
        self._counter = 1

    def get_all(self, client_id=None, cuit=None, business_name=None,
                amount_min=None, amount_max=None, date_from=None, date_to=None,
                bill_type_id=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, client, bill_type, date, subtotal, total, associated_bill=None):
        bill = _mock_bill_without_products(
            id=self._counter, cliente=client, tipo_factura=bill_type, fecha=date,
            subtotal=subtotal, total=total, factura_asociada=associated_bill,
        )
        self._items[self._counter] = bill
        self._counter += 1
        return bill

    def save(self, bill):
        return bill

    def delete(self, bill):
        self._items.pop(bill.id, None)

    def get_last_receipt_number(self, tipo_factura_id):
        return 0


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def fake_repo():
    return FakeBillRepo()


@pytest.fixture
def mock_service():
    return Mock()


@pytest.fixture
def viewset(fake_repo, mock_service):
    return BillViewSet(repository=fake_repo, service=mock_service)


@pytest.fixture
def fk_data(db):
    cliente = make_client(
        razon_social="Test SA",
        condicion_IVA=make_vat_condition(descripcion="Resp. Inscripto", codigo_afip=1),
        lista_precios=make_price_list(),
    )
    bill_type = make_bill_type(descripcion="Remito X", abreviatura="X", codigo_afip=None)
    producto = make_product(descripcion="Pera", cantidad_por_bulto=10, peso_aproximado=1.0)
    tipo_venta = make_sale_type(descripcion="Unidad")
    return cliente, bill_type, producto, tipo_venta


def _make_bill_mock(cliente, bill_type, subtotal=Decimal("1000"), total=Decimal("1105")):
    return _mock_bill_without_products(
        id=1, cliente=cliente, tipo_factura=bill_type, fecha=date.today(),
        subtotal=subtotal, total=total, numero_comprobante=1,
    )


# ── list ───────────────────────────────────────────────────────────────────────

def test_list_empty(factory, viewset):
    request = factory.get("/bill/")
    response = viewset.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 200
    assert response.data == []


def test_list_internal_error(factory, mock_service):
    class ExplodingRepo(FakeBillRepo):
        def get_all(self, **kwargs):
            raise Exception("boom")

    vs = BillViewSet(repository=ExplodingRepo(), service=mock_service)
    request = factory.get("/bill/")
    response = vs.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 500


# ── retrieve ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/bill/999/")
    response = viewset.retrieve(Request(request, parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404


@pytest.mark.django_db
def test_retrieve_ok(factory, viewset, fk_data):
    cliente, bill_type, *_ = fk_data
    bill = viewset.repository.create(
        client=cliente, bill_type=bill_type, date=date.today(),
        subtotal=Decimal("1000"), total=Decimal("1000"),
    )
    request = factory.get(f"/bill/{bill.id}/")
    response = viewset.retrieve(Request(request, parsers=[JSONParser()]), pk=bill.id)
    assert response.status_code == 200


# ── create ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_validation_error_missing_fields(factory, viewset):
    request = factory.post("/bill/", {}, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_ok_devuelve_subtotal_y_total(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    bill_mock = _make_bill_mock(cliente, bill_type)
    mock_service.create_bill.return_value = bill_mock

    request = factory.post("/bill/", {
        "cliente": cliente.id,
        "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 201


@pytest.mark.django_db
def test_create_price_not_found_returns_400(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.create_bill.side_effect = PriceNotFoundError("sin precio")

    request = factory.post("/bill/", {
        "cliente": cliente.id, "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_debit_note_validation_error_returns_400(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.create_bill.side_effect = DebitNoteValidationError("sin factura asociada")

    request = factory.post("/bill/", {
        "cliente": cliente.id, "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_arca_error_returns_400(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.create_bill.side_effect = WSFEEmissionError("error arca")

    request = factory.post("/bill/", {
        "cliente": cliente.id, "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 400


# ── update / partial_update ────────────────────────────────────────────────────

@pytest.mark.django_db
def test_patch_not_found(factory, viewset, mock_service):
    mock_service.update_bill.side_effect = BillNotFoundException("no encontrada")
    request = factory.patch("/bill/999/", {"fecha": str(date.today())}, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404


def test_patch_already_emitted_returns_409(factory, viewset, mock_service):
    mock_service.update_bill.side_effect = BillAlreadyEmittedException("La factura ya fue emitida por AFIP y no puede modificarse.")
    request = factory.patch("/bill/1/", {"fecha": str(date.today())}, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 409
    assert "afip" in response.data["detail"].lower()


@pytest.mark.django_db
def test_patch_ok(factory, viewset, mock_service, fk_data):
    cliente, bill_type, *_ = fk_data
    bill_mock = _make_bill_mock(cliente, bill_type)
    mock_service.update_bill.return_value = bill_mock

    request = factory.patch("/bill/1/", {"fecha": str(date.today())}, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 200


@pytest.mark.django_db
def test_patch_price_not_found_returns_400(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.update_bill.side_effect = PriceNotFoundError("sin precio")

    request = factory.patch("/bill/1/", {
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 400
    assert response.data["detail"] == "sin precio"


@pytest.mark.django_db
def test_put_price_not_found_returns_400(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.update_bill.side_effect = PriceNotFoundError("sin precio")

    request = factory.put("/bill/1/", {
        "cliente": cliente.id, "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.update(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_cliente_sin_lista_con_precio_manual_ok(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    cliente.lista_precios = None
    cliente.save()
    mock_service.create_bill.return_value = _make_bill_mock(cliente, bill_type)

    request = factory.post("/bill/", {
        "cliente": cliente.id, "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5", "precio_aplicado": "1200.00"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 201
    sent_items = mock_service.create_bill.call_args[0][0]['items']
    assert sent_items[0]['precio_aplicado'] == Decimal("1200.00")


# ── destroy ────────────────────────────────────────────────────────────────────

def test_destroy_not_found(factory, viewset, mock_service):
    mock_service.delete_bill.side_effect = BillNotFoundException("no encontrada")
    request = factory.delete("/bill/999/")
    response = viewset.destroy(Request(request, parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404


def test_destroy_already_emitted_returns_409(factory, viewset, mock_service):
    mock_service.delete_bill.side_effect = BillAlreadyEmittedException("La factura ya fue emitida por AFIP y no puede eliminarse.")
    request = factory.delete("/bill/1/")
    response = viewset.destroy(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 409
    assert "afip" in response.data["detail"].lower()


def test_destroy_has_payments_returns_409(factory, viewset, mock_service):
    mock_service.delete_bill.side_effect = BillHasPaymentsException("tiene pagos")
    request = factory.delete("/bill/1/")
    response = viewset.destroy(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 409
    assert "pagos" in response.data["detail"].lower()


def test_destroy_ok(factory, viewset, mock_service):
    mock_service.delete_bill.return_value = None
    request = factory.delete("/bill/1/")
    response = viewset.destroy(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 204
