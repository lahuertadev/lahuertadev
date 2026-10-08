import pytest

from django.utils import timezone
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from core.text import capitalize_words
from lista_precios.models import ListaPrecios
from lista_precios.views import PricesListViewSet
from lista_precios.interfaces import IPricesListRepository


def _build_price_list(**attrs):
    '''
    Instancia real de ListaPrecios sin guardar en la DB. Las fechas se completan a mano
    (auto_now solo se aplica al hacer save) para que el serializer de respuesta pueda formatearlas.
    '''
    now = timezone.now()
    return ListaPrecios(fecha_creacion=now, fecha_actualizacion=now, **attrs)


class FakeRepo(IPricesListRepository):
    def __init__(self):
        self._items = {}
        # id de lista -> cantidad de clientes asignados (por defecto ninguno)
        self.assigned_clients = {}
        # ids de clientes que "existen" y asignaciones hechas (cliente -> lista)
        self.existing_client_ids = {1, 2, 3}
        self.client_assignments = {}

    def get_all_prices_list(self, nombre=None):
        items = list(self._items.values())
        if nombre:
            items = [item for item in items if nombre.lower() in item.nombre.lower()]
        return items

    def get_prices_list_by_id(self, id):
        return self._items.get(int(id))

    def create_prices_list(self, data):
        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _build_price_list(id=new_id, nombre=data["nombre"], descripcion=data["descripcion"])
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

    def count_assigned_clients(self, prices_list):
        return self.assigned_clients.get(prices_list.id, 0)

    def get_missing_client_ids(self, client_ids):
        return sorted(set(client_ids) - self.existing_client_ids)

    def assign_to_clients(self, prices_list, client_ids):
        for client_id in client_ids:
            self.client_assignments[client_id] = prices_list.id
        return len(client_ids)

    def generate_unique_name(self, base_name):
        existing_names = [item.nombre for item in self._items.values()]
        new_name = base_name
        counter = 1
        while new_name in existing_names:
            new_name = f"{base_name} ({counter})"
            counter += 1
        return new_name

    def duplicate_prices_list(self, original_list):
        base_name = capitalize_words(f"Copia de {original_list.nombre}")
        new_name = self.generate_unique_name(base_name)

        new_id = 1 if not self._items else max(self._items.keys()) + 1
        obj = _build_price_list(
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


def test_list_with_filter(factory, viewset):
    viewset.repository.create_prices_list({"nombre": "Lista Verano", "descripcion": "D1"})
    viewset.repository.create_prices_list({"nombre": "Lista Invierno", "descripcion": "D2"})
    viewset.repository.create_prices_list({"nombre": "Precios Especiales", "descripcion": "D3"})

    request = factory.get("/price_list/?nombre=Lista")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2
    assert all("Lista" in item["nombre"] for item in response.data)


def test_list_with_partial_filter(factory, viewset):
    viewset.repository.create_prices_list({"nombre": "Verano 2024", "descripcion": "D1"})
    viewset.repository.create_prices_list({"nombre": "Verano 2025", "descripcion": "D2"})
    viewset.repository.create_prices_list({"nombre": "Invierno 2024", "descripcion": "D3"})

    request = factory.get("/price_list/?nombre=Verano")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2
    assert all("Verano" in item["nombre"] for item in response.data)


def test_list_filter_no_results(factory, viewset):
    viewset.repository.create_prices_list({"nombre": "Lista A", "descripcion": "D1"})
    viewset.repository.create_prices_list({"nombre": "Lista B", "descripcion": "D2"})

    request = factory.get("/price_list/?nombre=NoExiste")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 0


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
def test_create_capitalizes_name(factory, viewset):
    request = factory.post("/price_list/", {"nombre": "copia de lista mino", "descripcion": ""}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data["nombre"] == "Copia De Lista Mino"


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
def test_update_capitalizes_name(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Old", "descripcion": "Old"})

    request = factory.put(
        f"/price_list/{created.id}/", {"nombre": "LISTA  mayorista", "descripcion": "New"}, format="json"
    )
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["nombre"] == "Lista Mayorista"


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
def test_partial_update_capitalizes_name(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "Desc"})

    request = factory.patch(f"/price_list/{created.id}/", {"nombre": "lista de verano"}, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=created.id)

    assert response.status_code == 200
    assert response.data["nombre"] == "Lista De Verano"


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


@pytest.mark.django_db
def test_delete_blocked_when_assigned_to_one_client(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Asignada", "descripcion": "D"})
    viewset.repository.assigned_clients[created.id] = 1

    request = factory.delete(f"/price_list/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "asignada a 1 cliente." in response.data["error"]
    assert viewset.repository.get_prices_list_by_id(created.id) is not None


@pytest.mark.django_db
def test_delete_blocked_when_assigned_to_many_clients(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Asignada", "descripcion": "D"})
    viewset.repository.assigned_clients[created.id] = 3

    request = factory.delete(f"/price_list/{created.id}/")
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=created.id)

    assert response.status_code == 400
    assert "asignada a 3 clientes" in response.data["error"]
    assert viewset.repository.get_prices_list_by_id(created.id) is not None


# ------------------------- ASSIGN CLIENTS ------------------
def _assign_clients(factory, viewset, price_list_id, data):
    request = factory.post(f"/price_list/{price_list_id}/assign_clients/", data, format="json")
    drf_request = Request(request, parsers=[JSONParser()])
    return viewset.assign_clients(drf_request, pk=price_list_id)


@pytest.mark.django_db
def test_assign_clients_success(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "D"})

    response = _assign_clients(factory, viewset, created.id, {"client_ids": [1, 2]})

    assert response.status_code == 200
    assert response.data == {"assigned": 2}
    assert viewset.repository.client_assignments == {1: created.id, 2: created.id}


@pytest.mark.django_db
def test_assign_clients_price_list_not_found(factory, viewset):
    response = _assign_clients(factory, viewset, 999, {"client_ids": [1]})

    assert response.status_code == 404
    assert "no existe" in response.data["error"].lower()


@pytest.mark.django_db
def test_assign_clients_empty_list_error(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "D"})

    response = _assign_clients(factory, viewset, created.id, {"client_ids": []})

    assert response.status_code == 400
    assert "client_ids" in response.data
    assert viewset.repository.client_assignments == {}


@pytest.mark.django_db
def test_assign_clients_missing_clients_error(factory, viewset):
    created = viewset.repository.create_prices_list({"nombre": "Lista", "descripcion": "D"})

    response = _assign_clients(factory, viewset, created.id, {"client_ids": [1, 50]})

    assert response.status_code == 400
    assert "50" in response.data["error"]
    # No se asigna a nadie si alguno no existe
    assert viewset.repository.client_assignments == {}


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
    assert response.data["nombre"] == "Copia De Lista Original"
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
    assert response1.data["nombre"] == "Copia De Lista Test"

    # Segunda duplicación
    request2 = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request2 = Request(request2, parsers=[JSONParser()])
    response2 = viewset.duplicate(drf_request2, pk=created.id)

    assert response2.status_code == 201
    assert response2.data["nombre"] == "Copia De Lista Test (1)"

    # Tercera duplicación
    request3 = factory.post(f"/price_list/{created.id}/duplicate/")
    drf_request3 = Request(request3, parsers=[JSONParser()])
    response3 = viewset.duplicate(drf_request3, pk=created.id)

    assert response3.status_code == 201
    assert response3.data["nombre"] == "Copia De Lista Test (2)"


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

