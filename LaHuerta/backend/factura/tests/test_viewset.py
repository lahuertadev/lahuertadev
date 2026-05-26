import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock, MagicMock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from tipo_factura.models import TipoFactura
from cliente.models import Cliente
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_facturacion.models import TipoFacturacion
from lista_precios.models import ListaPrecios
from localidad.models import Localidad
from municipio.models import Municipio
from provincia.models import Provincia
from producto.models import Producto
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad
from tipo_venta.models import TipoVenta

from factura.views import BillViewSet
from factura.interfaces import IBillRepository
from factura.exceptions import BillNotFoundException, BillHasPaymentsException, BillAlreadyEmittedException, PriceNotFoundError
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError


# ── Fake repository ────────────────────────────────────────────────────────────

class FakeBillRepo(IBillRepository):
    def __init__(self):
        self._items = {}
        self._counter = 1

    def get_all(self, cliente_id=None, cuit=None, razon_social=None,
                importe_min=None, importe_max=None, fecha_desde=None, fecha_hasta=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, client, bill_type, date, amount):
        bill = Mock()
        bill.id = self._counter
        bill.cliente = client
        bill.tipo_factura = bill_type
        bill.fecha = date
        bill.importe = amount
        bill.numero_comprobante = None
        bill.cae = None
        bill.cae_vto = None
        bill.facturaproducto_set = MagicMock()
        bill.facturaproducto_set.__iter__ = Mock(return_value=iter([]))
        bill.facturaproducto_set.all.return_value = []
        bill.facturaproducto_set.exists.return_value = False
        self._items[self._counter] = bill
        self._counter += 1
        return bill

    def save(self, bill):
        return bill

    def delete(self, bill):
        self._items.pop(bill.id, None)

    def get_last_receipt_number(self, tipo_factura_id):
        return 0


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
    prov = Provincia.objects.create(nombre="Buenos Aires")
    muni = Municipio.objects.create(nombre="La Matanza", provincia=prov)
    localidad = Localidad.objects.create(id="12345678", nombre="Ciudadela", municipio=muni)
    tipo_facturacion = TipoFacturacion.objects.create(descripcion="Cuenta Corriente")
    condicion_iva = TipoCondicionIva.objects.create(descripcion="Resp. Inscripto", codigo_afip=1)
    lista_precios = ListaPrecios.objects.create(descripcion="Lista General")
    cliente = Cliente.objects.create(
        cuit="20123456789",
        razon_social="Test SA",
        cuenta_corriente=Decimal("0.00"),
        localidad=localidad,
        tipo_facturacion=tipo_facturacion,
        condicion_IVA=condicion_iva,
        telefono="1234567890",
        lista_precios=lista_precios,
    )
    bill_type = TipoFactura.objects.create(descripcion="Remito X", abreviatura="X", codigo_afip=None)
    categoria = Categoria.objects.create(descripcion="Frutas")
    contenedor = TipoContenedor.objects.create(descripcion="Cajon")
    unidad = TipoUnidad.objects.create(descripcion="Kilo")
    producto = Producto.objects.create(
        descripcion="Pera",
        categoria=categoria,
        tipo_contenedor=contenedor,
        tipo_unidad=unidad,
        cantidad_por_bulto=10,
        peso_aproximado=1.0,
    )
    tipo_venta = TipoVenta.objects.create(descripcion="Unidad")
    return cliente, bill_type, producto, tipo_venta


# ── list ───────────────────────────────────────────────────────────────────────

def test_list_empty(factory, viewset):
    request = factory.get("/bill/")
    response = viewset.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 200
    assert response.data == []


def test_list_internal_error(factory, fake_repo, mock_service):
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
    assert "no encontrada" in response.data["detail"].lower()


@pytest.mark.django_db
def test_retrieve_ok(factory, viewset, fk_data):
    cliente, bill_type, *_ = fk_data
    bill = viewset.repository.create(
        client=cliente, bill_type=bill_type, date=date.today(), amount=Decimal("1000")
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
def test_create_ok(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    bill_mock = Mock()
    bill_mock.id = 1
    bill_mock.cliente = cliente
    bill_mock.tipo_factura = bill_type
    bill_mock.fecha = date.today()
    bill_mock.importe = Decimal("1000")
    bill_mock.numero_comprobante = 1
    bill_mock.cae = None
    bill_mock.cae_vto = None
    bill_mock.facturaproducto_set = MagicMock()
    bill_mock.facturaproducto_set.__iter__ = Mock(return_value=iter([]))
    bill_mock.facturaproducto_set.all.return_value = []
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
        "cliente": cliente.id,
        "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_arca_auth_error_returns_502(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.create_bill.side_effect = WSAAAuthenticationError("auth error")

    request = factory.post("/bill/", {
        "cliente": cliente.id,
        "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 502


@pytest.mark.django_db
def test_create_wsfe_error_returns_502(factory, viewset, mock_service, fk_data):
    cliente, bill_type, producto, tipo_venta = fk_data
    mock_service.create_bill.side_effect = WSFEEmissionError("wsfe error")

    request = factory.post("/bill/", {
        "cliente": cliente.id,
        "tipo_factura": bill_type.id,
        "fecha": str(date.today()),
        "items": [{"producto": producto.id, "tipo_venta": tipo_venta.id, "cantidad": "5"}],
    }, format="json")
    response = viewset.create(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 502


# ── update / partial_update ────────────────────────────────────────────────────

@pytest.mark.django_db
def test_patch_not_found(factory, viewset, mock_service):
    mock_service.update_bill.side_effect = BillNotFoundException("no encontrada")

    request = factory.patch("/bill/999/", {"fecha": str(date.today())}, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404


def test_patch_already_emitted_returns_409(factory, viewset, mock_service):
    mock_service.update_bill.side_effect = BillAlreadyEmittedException("ya emitida")

    request = factory.patch("/bill/1/", {"fecha": str(date.today())}, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 409
    assert "afip" in response.data["detail"].lower()


@pytest.mark.django_db
def test_patch_ok(factory, viewset, mock_service, fk_data):
    cliente, bill_type, *_ = fk_data
    bill_mock = Mock()
    bill_mock.id = 1
    bill_mock.cliente = cliente
    bill_mock.tipo_factura = bill_type
    bill_mock.fecha = date.today()
    bill_mock.importe = Decimal("2000")
    bill_mock.numero_comprobante = 1
    bill_mock.cae = None
    bill_mock.cae_vto = None
    bill_mock.facturaproducto_set = MagicMock()
    bill_mock.facturaproducto_set.__iter__ = Mock(return_value=iter([]))
    bill_mock.facturaproducto_set.all.return_value = []
    mock_service.update_bill.return_value = bill_mock

    request = factory.patch("/bill/1/", {"fecha": str(date.today())}, format="json")
    response = viewset.partial_update(Request(request, parsers=[JSONParser()]), pk=1)
    assert response.status_code == 200


# ── destroy ────────────────────────────────────────────────────────────────────

def test_destroy_not_found(factory, viewset, mock_service):
    mock_service.delete_bill.side_effect = BillNotFoundException("no encontrada")

    request = factory.delete("/bill/999/")
    response = viewset.destroy(Request(request, parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404


def test_destroy_already_emitted_returns_409(factory, viewset, mock_service):
    mock_service.delete_bill.side_effect = BillAlreadyEmittedException("ya emitida")

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
