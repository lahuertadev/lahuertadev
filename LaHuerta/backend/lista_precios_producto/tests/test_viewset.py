import pytest

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from lista_precios_producto.views import PriceListProductViewSet
from lista_precios_producto.interfaces import IProductPriceListRepository
from core.tests.mocks import mock_product_price


class FakeRepo(IProductPriceListRepository):
    def __init__(self):
        self._items = {}

    def get_all(self, price_list_id=None, product_id=None, category_id=None, container_type_id=None, description=None):
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
        obj = mock_product_price(id=new_id, **data)
        self._items[new_id] = obj
        return obj

    def update(self, item, data):
        if "precio" in data:
            item.precio = data["precio"]
        return item

    def destroy(self, item):
        self._items.pop(int(item.id), None)

    def verify_product_on_price_list(self, product_id):
        return []

    def get_by_product_and_sale_type(self, price_list_id, product_id, sale_type_id):
        return next(
            (x for x in self._items.values()
             if str(x.lista_precios_id) == str(price_list_id)
             and str(x.producto_id) == str(product_id)
             and str(x.tipo_venta_id) == str(sale_type_id)),
            None,
        )


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

