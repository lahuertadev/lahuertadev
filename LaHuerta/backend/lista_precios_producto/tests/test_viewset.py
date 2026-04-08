import pytest
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from lista_precios_producto.views import PriceListProductViewSet
from lista_precios_producto.interfaces import IProductPriceListRepository
from lista_precios_producto.models import ListaPreciosProducto


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


class FakeRepo(IProductPriceListRepository):
    def __init__(self):
        self._items = {}

    def get_all(self, price_list_id=None, product_id=None, categoria_id=None, tipo_contenedor_id=None, descripcion=None):
        items = list(self._items.values())
        if price_list_id:
            items = [x for x in items if str(getattr(x, "lista_precios_id", None)) == str(price_list_id)]
        if product_id:
            items = [x for x in items if str(getattr(x, "producto_id", None)) == str(product_id)]
        # Los demás filtros no los implementamos en el fake, solo para compilación
        return items

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        # Guardamos ids para poder filtrar en get_all
        obj = _mock_model_instance(
            ListaPreciosProducto,
            id=new_id,
            lista_precios_id=getattr(data.get("lista_precios"), "id", data.get("lista_precios")),
            producto_id=getattr(data.get("producto"), "id", data.get("producto")),
            precio_unitario=data.get("precio_unitario"),
            precio_bulto=data.get("precio_bulto"),
            lista_precios=data.get("lista_precios"),
            producto=data.get("producto"),
        )
        self._items[new_id] = obj
        return obj

    def update(self, item, data):
        if "precio_unitario" in data:
            item.precio_unitario = data["precio_unitario"]
        if "precio_bulto" in data:
            item.precio_bulto = data["precio_bulto"]
        return item

    def destroy(self, item):
        self._items.pop(int(item.id), None)

    def verify_product_on_price_list(self, product_id):
        return []


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return PriceListProductViewSet(repository=FakeRepo())


def test_list_empty(factory, viewset):
    request = factory.get("/price_list_product/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)
    assert response.status_code == 200
    assert response.data == []


def test_retrieve_not_found(factory, viewset):
    request = factory.get("/price_list_product/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)
    assert response.status_code == 404
    assert "no existe" in response.data["error"].lower()


@pytest.mark.django_db
def test_create_validation_error(factory, viewset):
    request = factory.post("/price_list_product/", {}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)
    assert response.status_code == 400

