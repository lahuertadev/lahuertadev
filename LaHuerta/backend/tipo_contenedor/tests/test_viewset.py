import pytest
from unittest.mock import Mock, patch

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from tipo_contenedor.models import TipoContenedor
from tipo_contenedor.views import ContainerTypeViewSet
from tipo_contenedor.interfaces import IContainerTypeRepository


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


class FakeRepo(IContainerTypeRepository):
    def __init__(self):
        self._items = {}

    def get_all_container_types(self):
        return list(self._items.values())

    def get_container_by_id(self, id):
        return self._items.get(int(id))

    def create_container_type(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _mock_model_instance(TipoContenedor, id=new_id, descripcion=data["descripcion"])
        self._items[new_id] = obj
        return obj

    def modify_container_type(self, container_type, data):
        # El ViewSet valida existencia; si llega acá es porque ya existe.
        container_type.descripcion = data.get("descripcion", container_type.descripcion)
        return container_type

    def destroy_container_type(self, container_type):
        if not container_type:
            return
        self._items.pop(int(container_type.id), None)


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return ContainerTypeViewSet(repository=FakeRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/container_type/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.repository.create_container_type({"descripcion": "Cajon"})
    viewset.repository.create_container_type({"descripcion": "Jaula"})

    request = factory.get("/container_type/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/container_type/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404


def test_retrieve_success(factory, viewset):
    created = viewset.repository.create_container_type({"descripcion": "Bolsa"})

    request = factory.get(f"/container_type/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Bolsa"


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post("/container_type/", {"descripcion": "Pallet"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Pallet"


@pytest.mark.django_db
def test_create_validation_error(factory, viewset):
    request = factory.post("/container_type/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


@pytest.mark.django_db
def test_create_duplicate_description_returns_bad_request(factory, viewset):
    TipoContenedor.objects.create(descripcion="Cajon")

    request = factory.post("/container_type/", {"descripcion": "Cajon"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put("/container_type/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_update_success(factory, viewset):
    created = viewset.repository.create_container_type({"descripcion": "Old"})

    request = factory.put(f"/container_type/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_blocked_by_products(factory, viewset):
    created = viewset.repository.create_container_type({"descripcion": "NoEliminar"})

    with patch("tipo_contenedor.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_container_type_id.return_value = True

        request = factory.delete(f"/container_type/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "productos asociados" in response.data["error"].lower()


@pytest.mark.django_db
def test_delete_success(factory, viewset):
    created = viewset.repository.create_container_type({"descripcion": "Eliminar"})

    with patch("tipo_contenedor.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_container_type_id.return_value = False

        request = factory.delete(f"/container_type/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204


def test_urls_module_imports():
    import tipo_contenedor.urls  # noqa: F401

