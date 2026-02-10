import pytest
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from lista_precios.models import ListaPrecios
from lista_precios.views import PricesListViewSet
from lista_precios.interfaces import IPricesListRepository


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


class FakeRepo(IPricesListRepository):
    def __init__(self):
        self._items = {}

    def get_all_prices_list(self):
        return list(self._items.values())

    def get_prices_list_by_id(self, id):
        return self._items.get(int(id))

    def create_prices_list(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _mock_model_instance(ListaPrecios, id=new_id, nombre=data["nombre"], descripcion=data["descripcion"])
        self._items[new_id] = obj
        return obj

    def modify_prices_list(self, prices_list, data):
        obj = prices_list
        obj.nombre = data.get("nombre", obj.nombre)
        obj.descripcion = data.get("descripcion", obj.descripcion)
        return obj

    def destroy_prices_list(self, prices_list):
        self._items.pop(int(prices_list.id), None)


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return PricesListViewSet(repository=FakeRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/price_list/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.repository.create_prices_list({"nombre": "L1", "descripcion": "D1"})
    viewset.repository.create_prices_list({"nombre": "L2", "descripcion": "D2"})

    request = factory.get("/price_list/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/price_list/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert "no existe" in response.data["error"].lower()


def test_retrieve_success(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "Desc"})

    request = factory.get(f"/price_list/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["nombre"] == "Lista"


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post("/price_list/", {"nombre": "Nueva", "descripcion": "Desc"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["nombre"] == "Nueva"


@pytest.mark.django_db
def test_create_validation_error(factory, viewset):
    request = factory.post("/price_list/", {"nombre": "", "descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "nombre" in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put("/price_list/999/", {"nombre": "New", "descripcion": "D"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404
    assert "no existe" in response.data["error"].lower()


@pytest.mark.django_db
def test_update_success(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Old", "descripcion": "Old"})

    request = factory.put(
        f"/price_list/{created.id}/", {"nombre": "New", "descripcion": "New"}, format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["nombre"] == "New"


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_not_found(factory, viewset):
    request = factory.delete("/price_list/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_delete_success(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Eliminar", "descripcion": "D"})

    request = factory.delete(f"/price_list/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204

