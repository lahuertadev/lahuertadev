import pytest
from unittest.mock import Mock, patch

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from categoria.models import Categoria
from categoria.views import CategoryViewSet
from categoria.interfaces import ICategoryRepository


def _mock_model_instance(model_cls, **attrs):
    mock_obj = Mock(spec=model_cls)
    for k, v in attrs.items():
        setattr(mock_obj, k, v)
    if "id" in attrs:
        mock_obj.pk = attrs["id"]
    mock_obj._meta = Mock()
    mock_obj._meta.model = model_cls
    return mock_obj


class FakeRepo(ICategoryRepository):
    def __init__(self):
        self._items = {}

    def get_all_categories(self):
        return list(self._items.values())

    def create_category(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _mock_model_instance(Categoria, id=new_id, descripcion=data["descripcion"])
        self._items[new_id] = obj
        return obj

    def modify_category(self, id, data):
        obj = self._items.get(int(id))
        obj.descripcion = data.get("descripcion", obj.descripcion)
        return obj

    def get_category_by_id(self, id):
        return self._items.get(int(id))

    def destroy_category(self, id):
        self._items.pop(int(id), None)


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return CategoryViewSet(repository=FakeRepo())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get("/category/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.repository.create_category({"descripcion": "Frutas"})
    viewset.repository.create_category({"descripcion": "Verduras"})

    request = factory.get("/category/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get("/category/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert "no existe" in response.data["error"].lower()


def test_retrieve_success(factory, viewset):
    created = viewset.repository.create_category({"descripcion": "Lacteos"})

    request = factory.get(f"/category/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "Lacteos"


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    request = factory.post("/category/", {"descripcion": "Congelados"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["descripcion"] == "Congelados"


@pytest.mark.django_db
def test_create_validation_error(factory, viewset):
    request = factory.post("/category/", {"descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert "descripcion" in response.data


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put("/category/999/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404
    assert "no existe" in response.data["error"].lower()


@pytest.mark.django_db
def test_update_success(factory, viewset):
    created = viewset.repository.create_category({"descripcion": "Old"})

    request = factory.put(f"/category/{created.id}/", {"descripcion": "New"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["descripcion"] == "New"


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_delete_not_found(factory, viewset):
    request = factory.delete("/category/999/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404


@pytest.mark.django_db
def test_delete_blocked_by_products(factory, viewset):
    created = viewset.repository.create_category({"descripcion": "NoEliminar"})

    with patch("categoria.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_category_id.return_value = True

        request = factory.delete(f"/category/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "productos asociados" in response.data["error"].lower()


@pytest.mark.django_db
def test_delete_success(factory, viewset):
    created = viewset.repository.create_category({"descripcion": "Eliminar"})

    with patch("categoria.views.ProductRepository") as PR:
        PR.return_value.verify_products_with_category_id.return_value = False

        request = factory.delete(f"/category/{created.id}/")
        drf_request = Request(request, parsers=[JSONParser()])
        response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 204

