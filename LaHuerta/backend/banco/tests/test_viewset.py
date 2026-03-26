import pytest
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from banco.models import Banco
from banco.views import BankViewSet
from banco.interfaces import IBankRepository


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


class FakeRepo(IBankRepository):
    def __init__(self):
        self._items = {}

    def get_all_banks(self):
        return list(self._items.values())

    def get_bank_by_id(self, id):
        return self._items.get(int(id))

    def create_bank(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _mock_model_instance(Banco, id=new_id, descripcion=data["descripcion"])
        self._items[new_id] = obj
        return obj

    def modify_bank(self, bank, data):
        bank.descripcion = data.get("descripcion", bank.descripcion)
        return bank

    def delete_bank(self, bank):
        self._items.pop(bank.id, None)


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return BankViewSet(repository=FakeRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/bank/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.bank_repository.create_bank({"descripcion": "Banco Nación"})
    viewset.bank_repository.create_bank({"descripcion": "Banco Galicia"})

    request = factory.get("/bank/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/bank/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


def test_retrieve_success(factory, viewset):
    created = viewset.bank_repository.create_bank({"descripcion": "Banco Nación"})

    request = factory.get(f"/bank/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Banco Nación"


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post("/bank/", {"descripcion": "Banco Galicia"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Banco Galicia"


@pytest.mark.django_db
def test_create_validation_error_empty_descripcion(factory, viewset):
    request = factory.post("/bank/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_create_duplicate_descripcion(factory, viewset):
    Banco.objects.create(descripcion="Banco Nación")

    request = factory.post("/bank/", {"descripcion": "Banco Nación"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put("/bank/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_update_success(factory, viewset):
    created = viewset.bank_repository.create_bank({"descripcion": "Old"})

    request = factory.put(f"/bank/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


@pytest.mark.django_db
def test_update_validation_error_empty_descripcion(factory, viewset):
    created = viewset.bank_repository.create_bank({"descripcion": "Banco Nación"})

    request = factory.put(f"/bank/{created.id}/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_update_duplicate_descripcion(factory, viewset):
    Banco.objects.create(descripcion="Banco Galicia")
    created = viewset.bank_repository.create_bank({"descripcion": "Banco Nación"})

    request = factory.put(f"/bank/{created.id}/", {"descripcion": "Banco Galicia"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "descripcion" in response.data


# ------------------------- PARTIAL UPDATE ------------------
@pytest.mark.django_db
def test_partial_update_not_found(factory, viewset):
    request = factory.patch("/bank/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_partial_update_success(factory, viewset):
    created = viewset.bank_repository.create_bank({"descripcion": "Old"})

    request = factory.patch(f"/bank/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_not_found(factory, viewset):
    request = factory.delete("/bank/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_delete_success(factory, viewset):
    created = viewset.bank_repository.create_bank({"descripcion": "Eliminar"})

    request = factory.delete(f"/bank/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204
