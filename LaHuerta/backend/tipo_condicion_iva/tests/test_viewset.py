import pytest
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from core.tests.mocks import mock_vat_condition
from tipo_condicion_iva.views import ConditionIvaTypeViewSet
from tipo_condicion_iva.interfaces import IConditionIvaTypeRepository


class FakeRepo(IConditionIvaTypeRepository):

    def get_all(self):
        return []

    def get_by_id(self, id):
        if id == 1:
            return mock_vat_condition(id=1, descripcion="Responsable Inscripto", codigo_afip=None)
        raise ObjectDoesNotExist()

    def create(self, data):
        return mock_vat_condition(id=1, descripcion=data["descripcion"], codigo_afip=None)

    def update(self, id, data):
        if id != 1:
            raise ObjectDoesNotExist()
        return mock_vat_condition(id=1, descripcion=data["descripcion"], codigo_afip=None)

    def delete(self, id):
        if id != 1:
            raise ObjectDoesNotExist()
        return True


#* ------------------------- HELPERS -------------------------
@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return ConditionIvaTypeViewSet(repository=FakeRepo())


#? ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/type_condition_iva/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


#? ------------------------- GET BY ID -----------------------
def test_retrieve_success(factory, viewset):
    request = factory.get("/type_condition_iva/1/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=1)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Responsable Inscripto"

def test_retrieve_not_found(factory, viewset):
    request = factory.get("/type_condition_iva/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert "no encontrado" in response.data["detail"].lower()


#? ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post(
        "/type_condition_iva/",
        {"descripcion": "Monotributo"},
        format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])

    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Monotributo"


@pytest.mark.django_db
def test_create_validation_error(factory, viewset):
    request = factory.post(
        "/type_condition_iva/",
        {"descripcion": ""},
        format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])

    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


#? ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_success(factory, viewset):
    request = factory.put(
        "/type_condition_iva/1/",
        {"descripcion": "Exento"},
        format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])

    response = viewset.update(drf_request, pk=1)

    assert response.status_code == 200


@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put(
        "/type_condition_iva/999/",
        {"descripcion": "Exento"},
        format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])

    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404


#? ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_success(factory, viewset):
    request = factory.delete("/type_condition_iva/1/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=1)

    assert response.status_code == 204


def test_delete_not_found(factory, viewset):
    request = factory.delete("/type_condition_iva/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404
