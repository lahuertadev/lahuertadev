import pytest
from unittest.mock import patch

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from tipo_unidad.views import UnitTypeViewSet
from tipo_unidad.interfaces import IUnitTypeRepository
from core.tests.factories import make_unit_type
from core.tests.mocks import mock_unit_type


class FakeRepo(IUnitTypeRepository):
    def __init__(self):
        self._items = {}

    def get_all_unit_types(self):
        return list(self._items.values())

    def get_unit_type_by_id(self, id):
        return self._items.get(int(id))

    def create_unit_type(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = mock_unit_type(id=new_id, **data)
        self._items[new_id] = obj
        return obj

    def modify_unit_type(self, unit_type, data):
        unit_type.descripcion = data.get("descripcion", unit_type.descripcion)
        unit_type.abreviacion = data.get("abreviacion", unit_type.abreviacion)
        unit_type.tipo_medicion = data.get("tipo_medicion", unit_type.tipo_medicion)
        return unit_type

    def destroy_unit_type(self, unit_type):
        self._items.pop(int(unit_type.id), None)


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return UnitTypeViewSet(repository=FakeRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/unit_type/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.repository.create_unit_type({"descripcion": "Kilo"})
    viewset.repository.create_unit_type({"descripcion": "Gramo"})

    request = factory.get("/unit_type/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/unit_type/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404


def test_retrieve_success(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "Unidad"})

    request = factory.get(f"/unit_type/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Unidad"


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post("/unit_type/", {"descripcion": "Docena", "abreviacion": "doc", "tipo_medicion": "CANTIDAD"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Docena"


@pytest.mark.django_db
def test_create_validation_error(factory, viewset):
    request = factory.post("/unit_type/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_create_duplicate_description_returns_bad_request(factory, viewset):
    # unique=True en el modelo -> serializer rechaza duplicado
    make_unit_type(descripcion="Kilo")

    request = factory.post("/unit_type/", {"descripcion": "Kilo"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert response.data["descripcion"] == ["Ya existe un tipo de unidad con esa descripción."]


@pytest.mark.django_db
def test_create_duplicate_abbreviation_returns_bad_request(factory, viewset):
    make_unit_type(descripcion="Kilogramo", abreviacion="kg")

    request = factory.post("/unit_type/", {"descripcion": "Kilo", "abreviacion": "KG", "tipo_medicion": "PESO"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert response.data["abreviacion"] == ["Ya existe un tipo de unidad con esa abreviatura."]


@pytest.mark.django_db
def test_update_to_another_abbreviation_returns_duplicate_error(factory):
    make_unit_type(descripcion="Bolsa", abreviacion="bol")
    unit_type = make_unit_type(descripcion="Cajón", abreviacion="caj")
    viewset = UnitTypeViewSet()

    response = _put(factory, viewset, unit_type.id, {"descripcion": "Cajón", "abreviacion": "bol", "tipo_medicion": "CANTIDAD"})

    assert response.status_code == 400
    assert response.data["abreviacion"] == ["Ya existe un tipo de unidad con esa abreviatura."]


@pytest.mark.django_db
def test_create_without_abbreviation_returns_bad_request(factory, viewset):
    request = factory.post("/unit_type/", {"descripcion": "Docena", "tipo_medicion": "CANTIDAD"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "abreviacion" in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put("/unit_type/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_update_success(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "Old"})

    request = factory.put(f"/unit_type/{created.id}/", {"descripcion": "New", "abreviacion": "new", "tipo_medicion": "CANTIDAD"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"
    assert response.data["abreviacion"] == "new"


def _put(factory, viewset, unit_type_id, data):
    request = factory.put(f"/unit_type/{unit_type_id}/", data, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    return viewset.update(drf_request, pk=unit_type_id)


@pytest.mark.django_db
def test_update_keeping_the_same_description_is_not_a_duplicate(factory):
    unit_type = make_unit_type(descripcion="Cajón", abreviacion="caj")
    viewset = UnitTypeViewSet()

    response = _put(factory, viewset, unit_type.id, {"descripcion": "Cajón", "abreviacion": "cj", "tipo_medicion": "CANTIDAD"})

    assert response.status_code == 200
    unit_type.refresh_from_db()
    assert unit_type.abreviacion == "cj"


@pytest.mark.django_db
def test_update_to_another_description_returns_duplicate_error(factory):
    make_unit_type(descripcion="Bolsa")
    unit_type = make_unit_type(descripcion="Cajón")
    viewset = UnitTypeViewSet()

    response = _put(factory, viewset, unit_type.id, {"descripcion": "Bolsa", "abreviacion": "bol", "tipo_medicion": "CANTIDAD"})

    assert response.status_code == 400
    assert response.data["descripcion"] == ["Ya existe un tipo de unidad con esa descripción."]


@pytest.mark.django_db
def test_update_system_record_is_blocked(factory, viewset):
    unit_type = mock_unit_type(id=1, descripcion="Kilogramo", tipo_medicion="PESO", is_system=True)
    viewset.repository._items[1] = unit_type

    response = _put(factory, viewset, 1, {"descripcion": "Kilo", "abreviacion": "kg", "tipo_medicion": "PESO"})

    assert response.status_code == 400
    assert "sistema" in response.data["error"]


@pytest.mark.django_db
def test_update_measurement_type_blocked_when_it_has_products(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "Cajón", "tipo_medicion": "CANTIDAD"})

    with patch("tipo_unidad.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_unit_type_id.return_value = True
        response = _put(factory, viewset, created.id, {"descripcion": "Cajón", "abreviacion": "caj", "tipo_medicion": "PESO"})

    assert response.status_code == 400
    assert response.data["error"] == "No se puede cambiar el tipo de medición: el tipo de unidad tiene productos asociados."
    assert created.tipo_medicion == "CANTIDAD"


@pytest.mark.django_db
def test_update_measurement_type_allowed_without_products(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "Cajón", "tipo_medicion": "CANTIDAD"})

    with patch("tipo_unidad.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_unit_type_id.return_value = False
        response = _put(factory, viewset, created.id, {"descripcion": "Cajón", "abreviacion": "caj", "tipo_medicion": "PESO"})

    assert response.status_code == 200
    assert response.data["tipo_medicion"] == "PESO"


@pytest.mark.django_db
def test_update_with_products_keeping_measurement_type_does_not_check_products(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "Cajón", "tipo_medicion": "CANTIDAD"})

    with patch("tipo_unidad.views.ProductRepository") as PR:
        response = _put(factory, viewset, created.id, {"descripcion": "Cajón grande", "abreviacion": "caj", "tipo_medicion": "CANTIDAD"})

    assert response.status_code == 200
    PR.return_value.verify_products_with_unit_type_id.assert_not_called()


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_blocked_by_products(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "NoEliminar"})

    with patch("tipo_unidad.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_unit_type_id.return_value = True

        request = factory.delete(f"/unit_type/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "productos asociados" in response.data["error"].lower()


@pytest.mark.django_db
def test_delete_success(factory, viewset):
    created = viewset.repository.create_unit_type({"descripcion": "Eliminar"})

    with patch("tipo_unidad.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_unit_type_id.return_value = False

        request = factory.delete(f"/unit_type/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204

