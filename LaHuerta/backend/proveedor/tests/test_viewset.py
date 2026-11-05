import pytest
from types import SimpleNamespace
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from mercado.models import Mercado
from proveedor.models import Proveedor
from proveedor.views import SupplierViewSet
from proveedor.interfaces import ISupplierRepository
from contacto.exceptions import ContactNotFoundException
from core.tests.factories import make_market, make_supplier


def _mock_mercado(id=1, descripcion='Belgrano'):
    obj = Mock(spec=Mercado)
    obj.id = id
    obj.pk = id
    obj.descripcion = descripcion
    obj._meta = Mock()
    obj._meta.model = Mercado
    return obj


def _mock_contact(id=1, numero='1234567', descripcion=None, email=None):
    return SimpleNamespace(id=id, numero=numero, descripcion=descripcion, email=email)


def _mock_supplier(id, nombre, puesto=1, nave=None, contacts=None,
                   cuenta_corriente=0, nombre_fantasia='Fantasia', mercado=None):
    if mercado is None:
        mercado = _mock_mercado()
    if contacts is None:
        contacts = [_mock_contact()]

    obj = Mock(spec=Proveedor)
    obj.id = id
    obj.pk = id
    obj.nombre = nombre
    obj.puesto = puesto
    obj.nave = nave
    # ContactSerializer(many=True) itera la lista tal cual; con un manager real llama a .all().
    obj.contactos = contacts
    obj.cuenta_corriente = cuenta_corriente
    obj.nombre_fantasia = nombre_fantasia
    obj.mercado = mercado
    obj._meta = Mock()
    obj._meta.model = Proveedor
    return obj


class FakeSupplierRepo(ISupplierRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1

    def _add(self, nombre='Prov', puesto=1, nave=None, contacts=None,
             cuenta_corriente=0, nombre_fantasia='Fantasia', mercado=None):
        obj = _mock_supplier(
            id=self._next_id,
            nombre=nombre,
            puesto=puesto,
            nave=nave,
            contacts=contacts,
            cuenta_corriente=cuenta_corriente,
            nombre_fantasia=nombre_fantasia,
            mercado=mercado,
        )
        self._items[self._next_id] = obj
        self._next_id += 1
        return obj

    def get_all_suppliers(self, searchQuery=None, mercado=None):
        items = list(self._items.values())
        if searchQuery:
            q = searchQuery.lower()
            items = [s for s in items if q in s.nombre.lower() or q in s.nombre_fantasia.lower()]
        if mercado:
            items = [s for s in items if mercado.lower() in s.mercado.descripcion.lower()]
        return items

    def get_supplier_by_id(self, id):
        return self._items.get(int(id))

    def create_supplier(self, data):
        mercado = data.get('mercado')
        obj = _mock_supplier(
            id=self._next_id,
            nombre=data.get('nombre', ''),
            puesto=data.get('puesto', 1),
            nave=data.get('nave'),
            cuenta_corriente=data.get('cuenta_corriente', 0),
            nombre_fantasia=data.get('nombre_fantasia', ''),
            mercado=mercado,
        )
        self._items[self._next_id] = obj
        self._next_id += 1
        return obj

    def modify_supplier(self, supplier, data):
        for k, v in data.items():
            setattr(supplier, k, v)
        return supplier

    def delete_supplier(self, supplier):
        self._items.pop(supplier.id, None)

    def update_balance(self, supplier):
        return supplier


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def viewset():
    return SupplierViewSet(repository=FakeSupplierRepo(), contact_service=Mock())


# ------------------------- LIST ----------------------------
def test_list_empty(factory, viewset):
    request = factory.get('/supplier/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert response.data == []


def test_list_with_items(factory, viewset):
    viewset.supplier_repository._add(nombre='ProvA')
    viewset.supplier_repository._add(nombre='ProvB')

    request = factory.get('/supplier/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 2


def test_list_filter_by_search_query(factory, viewset):
    viewset.supplier_repository._add(nombre='Juan', nombre_fantasia='JF')
    viewset.supplier_repository._add(nombre='Pedro', nombre_fantasia='PF')

    request = factory.get('/supplier/', {'searchQuery': 'Juan'})
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['nombre'] == 'Juan'


def test_list_filter_by_mercado(factory, viewset):
    mercado_belg = _mock_mercado(1, 'Belgrano')
    mercado_cent = _mock_mercado(2, 'Central')
    viewset.supplier_repository._add(nombre='ProvBelg', mercado=mercado_belg)
    viewset.supplier_repository._add(nombre='ProvCent', mercado=mercado_cent)

    request = factory.get('/supplier/', {'mercado': 'Belgrano'})
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.list(drf_request)

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['nombre'] == 'ProvBelg'


# ------------------------- RETRIEVE ------------------------
def test_retrieve_not_found(factory, viewset):
    request = factory.get('/supplier/999/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


def test_retrieve_success(factory, viewset):
    supplier = viewset.supplier_repository._add(nombre='ProvTest')

    request = factory.get(f'/supplier/{supplier.id}/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.retrieve(drf_request, pk=supplier.id)

    assert response.status_code == 200
    assert response.data['nombre'] == 'ProvTest'


# ------------------------- CREATE --------------------------
@pytest.mark.django_db
def test_create_success(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    payload = {
        'nombre': 'nuevo PROV',
        'puesto': 5,
        'nave': 2,
        'contactos': [{'numero': '1234567'}],
        'nombre_fantasia': 'NP Fantasia',
        'mercado': mercado.id,
    }

    request = factory.post('/supplier/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 201
    assert response.data['nombre'] == 'Nuevo Prov'
    assert response.data['mercado']['id'] == mercado.id


@pytest.mark.django_db
def test_create_missing_required_fields(factory, viewset):
    request = factory.post('/supplier/', {}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400
    assert 'nombre' in response.data


@pytest.mark.django_db
def test_create_duplicate_nombre(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    make_supplier(
        nombre='Duplicado',
        puesto=1,
        nombre_fantasia='',
        cuenta_corriente=0,
        mercado=mercado,
    )

    payload = {
        'nombre': 'Duplicado',
        'puesto': 2,
        'contactos': [{'numero': '9999999'}],
        'nombre_fantasia': 'NF',
        'mercado': mercado.id,
    }
    request = factory.post('/supplier/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.create(drf_request)

    assert response.status_code == 400


# ------------------------- UPDATE --------------------------
@pytest.mark.django_db
def test_update_not_found(factory, viewset):
    request = factory.put('/supplier/999/', {'nombre': 'X'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_update_success(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    supplier = viewset.supplier_repository._add(
        nombre='OriginalNombre',
        mercado=_mock_mercado(mercado.id, 'Belgrano'),
    )
    payload = {
        'nombre': 'nombre actualizado',
        'puesto': 3,
        'contactos': [{'numero': '9876543'}],
        'nombre_fantasia': 'NF Nuevo',
        'mercado': mercado.id,
    }

    request = factory.put(f'/supplier/{supplier.id}/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=supplier.id)

    assert response.status_code == 200
    assert response.data['nombre'] == 'Nombre Actualizado'


@pytest.mark.django_db
def test_update_duplicate_nombre(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    make_supplier(
        nombre='NombreExistente',
        puesto=1,
        nombre_fantasia='',
        cuenta_corriente=0,
        mercado=mercado,
    )
    supplier = viewset.supplier_repository._add(
        nombre='OtroNombre',
        mercado=_mock_mercado(mercado.id, 'Belgrano'),
    )
    payload = {
        'nombre': 'NombreExistente',
        'puesto': 2,
        'contactos': [{'numero': '9999999'}],
        'nombre_fantasia': 'NF',
        'mercado': mercado.id,
    }

    request = factory.put(f'/supplier/{supplier.id}/', payload, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.update(drf_request, pk=supplier.id)

    assert response.status_code == 400


# ------------------------- PARTIAL UPDATE ------------------
@pytest.mark.django_db
def test_partial_update_not_found(factory, viewset):
    request = factory.patch('/supplier/999/', {'nombre': 'X'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_partial_update_success(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    supplier = viewset.supplier_repository._add(
        nombre='OriginalNombre',
        mercado=_mock_mercado(mercado.id, 'Belgrano'),
    )

    request = factory.patch(f'/supplier/{supplier.id}/', {'nombre': 'nombre parcial'}, format='json')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.partial_update(drf_request, pk=supplier.id)

    assert response.status_code == 200
    assert response.data['nombre'] == 'Nombre Parcial'


# ------------------------- DELETE --------------------------
@pytest.mark.django_db
def test_destroy_not_found(factory, viewset):
    request = factory.delete('/supplier/999/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=999)

    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_destroy_success(factory, viewset):
    supplier = viewset.supplier_repository._add(nombre='AEliminar')

    request = factory.delete(f'/supplier/{supplier.id}/')
    drf_request = Request(request, parsers=[JSONParser()])
    response = viewset.destroy(drf_request, pk=supplier.id)

    assert response.status_code == 204
    assert viewset.supplier_repository.get_supplier_by_id(supplier.id) is None


@pytest.mark.django_db
def test_create_duplicate_nombre_escrito_distinto(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    make_supplier(
        nombre='Los Hermanos',
        puesto=1,
        nombre_fantasia='',
        cuenta_corriente=0,
        mercado=mercado,
    )

    payload = {
        'nombre': 'LOS hermanos',
        'puesto': 2,
        'contactos': [{'numero': '9999999'}],
        'nombre_fantasia': 'NF',
        'mercado': mercado.id,
    }
    request = factory.post('/supplier/', payload, format='json')
    response = viewset.create(Request(request, parsers=[JSONParser()]))

    assert response.status_code == 400


# ------------------------- CONTACTOS -----------------------
def test_retrieve_includes_contacts(factory, viewset):
    supplier = viewset.supplier_repository._add(contacts=[
        _mock_contact(1, '1144448888'),
        _mock_contact(2, '1122334455', 'Encargado', 'ventas@prov.com'),
    ])

    response = viewset.retrieve(Request(factory.get(f'/supplier/{supplier.id}/'), parsers=[JSONParser()]), pk=supplier.id)

    assert response.status_code == 200
    assert response.data['contactos'] == [
        {'id': 1, 'numero': '1144448888', 'descripcion': None, 'email': None},
        {'id': 2, 'numero': '1122334455', 'descripcion': 'Encargado', 'email': 'ventas@prov.com'},
    ]


@pytest.mark.django_db
def test_create_syncs_contacts(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    payload = {
        'nombre': 'Prov Contactos',
        'puesto': 5,
        'contactos': [{'numero': '1144448888', 'descripcion': '', 'email': ''}, {'numero': '1122334455', 'descripcion': 'Encargado'}],
        'nombre_fantasia': 'NF',
        'mercado': mercado.id,
    }

    response = viewset.create(Request(factory.post('/supplier/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 201
    owner_field, supplier, contacts = viewset.contact_service.sync_contacts.call_args.args
    assert owner_field == 'proveedor'
    assert supplier.id == response.data['id']
    assert [dict(contact) for contact in contacts] == [
        {'numero': '1144448888', 'descripcion': None, 'email': None},
        {'numero': '1122334455', 'descripcion': 'Encargado'},
    ]


@pytest.mark.django_db
@pytest.mark.parametrize('contacts', [[], None])
def test_create_without_contacts(factory, viewset, contacts):
    mercado = make_market(descripcion='Belgrano')
    payload = {'nombre': 'Prov', 'puesto': 5, 'nombre_fantasia': 'NF', 'mercado': mercado.id}
    if contacts is not None:
        payload['contactos'] = contacts

    response = viewset.create(Request(factory.post('/supplier/', payload, format='json'), parsers=[JSONParser()]))

    assert response.status_code == 400
    assert 'contactos' in response.data
    viewset.contact_service.sync_contacts.assert_not_called()


@pytest.mark.django_db
def test_update_syncs_contacts(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    supplier = viewset.supplier_repository._add(nombre='Prov', mercado=_mock_mercado(mercado.id, 'Belgrano'))
    payload = {
        'nombre': 'Prov',
        'puesto': 3,
        'contactos': [{'id': 1, 'numero': '1199998888'}],
        'nombre_fantasia': 'NF',
        'mercado': mercado.id,
    }

    response = viewset.update(Request(factory.put(f'/supplier/{supplier.id}/', payload, format='json'), parsers=[JSONParser()]), pk=supplier.id)

    assert response.status_code == 200
    owner_field, synced_supplier, contacts = viewset.contact_service.sync_contacts.call_args.args
    assert (owner_field, synced_supplier) == ('proveedor', supplier)
    assert [dict(contact) for contact in contacts] == [{'id': 1, 'numero': '1199998888'}]


@pytest.mark.django_db
def test_update_with_contact_of_other_owner(factory, viewset):
    mercado = make_market(descripcion='Belgrano')
    supplier = viewset.supplier_repository._add(nombre='Prov', mercado=_mock_mercado(mercado.id, 'Belgrano'))
    viewset.contact_service.sync_contacts.side_effect = ContactNotFoundException('Contacto no encontrado.')
    payload = {'nombre': 'Prov', 'puesto': 3, 'contactos': [{'id': 99, 'numero': '1199998888'}], 'nombre_fantasia': 'NF', 'mercado': mercado.id}

    response = viewset.update(Request(factory.put(f'/supplier/{supplier.id}/', payload, format='json'), parsers=[JSONParser()]), pk=supplier.id)

    assert response.status_code == 400
    assert response.data['detail'] == 'Contacto no encontrado.'


@pytest.mark.django_db
def test_partial_update_without_contacts_does_not_sync(factory, viewset):
    supplier = viewset.supplier_repository._add(nombre='Prov')

    response = viewset.partial_update(Request(factory.patch(f'/supplier/{supplier.id}/', {'puesto': 9}, format='json'), parsers=[JSONParser()]), pk=supplier.id)

    assert response.status_code == 200
    viewset.contact_service.sync_contacts.assert_not_called()
