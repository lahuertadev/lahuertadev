import pytest
from unittest.mock import Mock, patch

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from tipo_unidad.models import TipoUnidad
from tipo_unidad.views import UnitTypeViewSet
from tipo_unidad.interfaces import IUnitTypeRepository


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


class FakeRepo(IUnitTypeRepository):
    def __init__(self):
        self._items = {}

    def get_all_unit_types(self):
        return list(self._items.values())

    def get_unit_type_by_id(self, id):
        return self._items.get(int(id))

    def create_unit_type(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _mock_model_instance(TipoUnidad, id=new_id, descripcion=data["descripcion"])
        self._items[new_id] = obj
        return obj

    def modify_unit_type(self, unit_type, data):
        unit_type.descripcion = data.get("descripcion", unit_type.descripcion)
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
    request = factory.post("/unit_type/", {"descripcion": "Docena"}, format="json")
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
    TipoUnidad.objects.create(descripcion="Kilo")

    request = factory.post("/unit_type/", {"descripcion": "Kilo"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


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

    request = factory.put(f"/unit_type/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


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

