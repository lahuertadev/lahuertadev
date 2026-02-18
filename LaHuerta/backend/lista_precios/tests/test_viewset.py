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
        new_name = data.get("nombre", obj.nombre)
        
        # Si el nombre está cambiando, verificar que no exista otro con ese nombre
        if new_name != obj.nombre:
            existing_names = [item.nombre for item in self._items.values() if item.id != obj.id]
            if new_name in existing_names:
                raise ValueError(f"Ya existe una lista de precios con el nombre '{new_name}'")
        
        obj.nombre = new_name
        obj.descripcion = data.get("descripcion", obj.descripcion)
        return obj

    def destroy_prices_list(self, prices_list):
        self._items.pop(int(prices_list.id), None)

    def generate_unique_name(self, base_name):
        existing_names = [item.nombre for item in self._items.values()]
        new_name = base_name
        counter = 1
        while new_name in existing_names:
            new_name = f"{base_name} ({counter})"
            counter += 1
        return new_name

    def duplicate_prices_list(self, original_list):
        base_name = f"Copia de {original_list.nombre}"
        new_name = self.generate_unique_name(base_name)
        
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _mock_model_instance(
            ListaPrecios, 
            id=new_id, 
            nombre=new_name, 
            descripcion=original_list.descripcion
        )
        self._items[new_id] = obj
        return obj


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


@pytest.mark.django_db
def test_update_same_name_success(factory, viewset):
    """
    Test que verifica que se puede actualizar sin cambiar el nombre
    """
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "Desc Original"})

    request = factory.put(
        f"/price_list/{created.id}/", {"nombre": "Lista", "descripcion": "Desc Nueva"}, format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["nombre"] == "Lista"
    assert response.data["descripcion"] == "Desc Nueva"


@pytest.mark.django_db
def test_update_duplicate_name_error(factory, viewset):
    """
    Test que verifica que devuelve error al intentar cambiar a un nombre existente
    """
    viewset.repository.create_prices_list({"nombre": "Existente", "descripcion": "Desc 1"})
    created = viewset.repository.create_prices_list({"nombre": "Original", "descripcion": "Desc 2"})

    request = factory.put(
        f"/price_list/{created.id}/", {"nombre": "Existente", "descripcion": "Desc"}, format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "Ya existe una lista de precios" in response.data["error"]


@pytest.mark.django_db
def test_partial_update_success(factory, viewset):
    """
    Test que verifica que PATCH funciona correctamente
    """
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "Desc Original"})

    request = factory.patch(
        f"/price_list/{created.id}/", {"descripcion": "Desc Nueva"}, format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["nombre"] == "Lista"
    assert response.data["descripcion"] == "Desc Nueva"


@pytest.mark.django_db
def test_partial_update_duplicate_name_error(factory, viewset):
    """
    Test que verifica que PATCH devuelve error al intentar cambiar a un nombre existente
    """
    viewset.repository.create_prices_list({"nombre": "Existente", "descripcion": "Desc 1"})
    created = viewset.repository.create_prices_list({"nombre": "Original", "descripcion": "Desc 2"})

    request = factory.patch(
        f"/price_list/{created.id}/", {"nombre": "Existente"}, format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "Ya existe una lista de precios" in response.data["error"]


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


# ------------------------- DUPLICATE -----------------------
@pytest.mark.django_db
def test_duplicate_not_found(factory, viewset):
    """
    Test que verifica el manejo de error al duplicar una lista inexistente
    """
    request = factory.post("/price_list/999/duplicate/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.duplicate(drf_request, pk=999)

    assert response.status_code == 404
    assert "error" in response.data


@pytest.mark.django_db
def test_duplicate_success(factory, viewset):
    """
    Test que verifica que el endpoint duplica correctamente una lista de precios
    """
    created = viewset.repository.create_prices_list({"nombre": "Lista Original", "descripcion": "Desc Original"})

    request = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.duplicate(drf_request, pk=created.id)

    assert response.status_code == 201
    assert "id" in response.data
    assert response.data["nombre"] == "Copia de Lista Original"
    assert response.data["descripcion"] == "Desc Original"
    assert response.data["id"] != created.id


@pytest.mark.django_db
def test_duplicate_unique_names(factory, viewset):
    """
    Test que verifica que se generan nombres únicos en duplicaciones múltiples
    """
    created = viewset.repository.create_prices_list({"nombre": "Lista Test", "descripcion": "Test"})

    # Primera duplicación
    request1 = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request1 = Request(request1, parsers=[JSONParser()])
    response1 = viewset.duplicate(drf_request1, pk=created.id)

    assert response1.status_code == 201
    assert response1.data["nombre"] == "Copia de Lista Test"

    # Segunda duplicación
    request2 = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request2 = Request(request2, parsers=[JSONParser()])
    response2 = viewset.duplicate(drf_request2, pk=created.id)

    assert response2.status_code == 201
    assert response2.data["nombre"] == "Copia de Lista Test (1)"

    # Tercera duplicación
    request3 = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request3 = Request(request3, parsers=[JSONParser()])
    response3 = viewset.duplicate(drf_request3, pk=created.id)

    assert response3.status_code == 201
    assert response3.data["nombre"] == "Copia de Lista Test (2)"


@pytest.mark.django_db
def test_duplicate_response_format(factory, viewset):
    """
    Test que verifica el formato de la respuesta del endpoint
    """
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "Desc"})

    request = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.duplicate(drf_request, pk=created.id)

    assert response.status_code == 201
    
    # Verificar que la respuesta contiene los campos esperados del serializer
    assert "id" in response.data
    assert "nombre" in response.data
    assert "descripcion" in response.data

