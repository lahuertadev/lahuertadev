import pytest

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from mercado.views import MarketViewSet
from mercado.interfaces import IMarketRepository
from core.tests.factories import make_market
from core.tests.mocks import mock_market


class FakeRepo(IMarketRepository):
    def __init__(self):
        self._items = {}

    def get_all_markets(self):
        return list(self._items.values())

    def get_market_by_id(self, id):
        return self._items.get(int(id))

    def create_market(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = mock_market(id=new_id, **data)
        self._items[new_id] = obj
        return obj

    def modify_market(self, market, data):
        market.descripcion = data.get("descripcion", market.descripcion)
        return market

    def delete_market(self, market):
        self._items.pop(market.id, None)


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return MarketViewSet(repository=FakeRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/market/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.market_repository.create_market({"descripcion": "Belgrano"})
    viewset.market_repository.create_market({"descripcion": "Central"})

    request = factory.get("/market/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/market/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


def test_retrieve_success(factory, viewset):
    created = viewset.market_repository.create_market({"descripcion": "Belgrano"})

    request = factory.get(f"/market/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Belgrano"


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post("/market/", {"descripcion": "Central"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Central"


@pytest.mark.django_db
def test_create_validation_error_empty_descripcion(factory, viewset):
    request = factory.post("/market/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_create_duplicate_descripcion(factory, viewset):
    make_market(descripcion="Belgrano")

    request = factory.post("/market/", {"descripcion": "Belgrano"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put("/market/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_update_success(factory, viewset):
    created = viewset.market_repository.create_market({"descripcion": "Old"})

    request = factory.put(f"/market/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


@pytest.mark.django_db
def test_update_validation_error_empty_descripcion(factory, viewset):
    created = viewset.market_repository.create_market({"descripcion": "Belgrano"})

    request = factory.put(f"/market/{created.id}/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_update_duplicate_descripcion(factory, viewset):
    make_market(descripcion="Central")
    created = viewset.market_repository.create_market({"descripcion": "Belgrano"})

    request = factory.put(f"/market/{created.id}/", {"descripcion": "Central"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "descripcion" in response.data


# ------------------------- PARTIAL UPDATE ------------------
@pytest.mark.django_db
def test_partial_update_not_found(factory, viewset):
    request = factory.patch("/market/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_partial_update_success(factory, viewset):
    created = viewset.market_repository.create_market({"descripcion": "Old"})

    request = factory.patch(f"/market/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_not_found(factory, viewset):
    request = factory.delete("/market/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_delete_success(factory, viewset):
    created = viewset.market_repository.create_market({"descripcion": "Eliminar"})

    request = factory.delete(f"/market/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204
