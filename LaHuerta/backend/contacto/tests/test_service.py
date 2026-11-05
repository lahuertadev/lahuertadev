import pytest
from types import SimpleNamespace
from unittest.mock import Mock

from contacto.service import ContactService
from contacto.exceptions import ContactNotFoundException, ContactRequiredException


@pytest.fixture
def repository():
    return Mock()


@pytest.fixture
def service(repository):
    return ContactService(contact_repository=repository)


def _contact(id, numero='1111111111'):
    return SimpleNamespace(id=id, numero=numero)


def test_sync_creates_contacts_without_id(service, repository):
    owner = Mock()
    repository.get_contacts_by_owner.return_value = []

    service.sync_contacts('cliente', owner, [{'numero': '1155551234', 'descripcion': None, 'email': None}])

    repository.get_contacts_by_owner.assert_called_once_with('cliente', owner)
    repository.create_contact.assert_called_once_with('cliente', owner, {'numero': '1155551234', 'descripcion': None, 'email': None})
    repository.modify_contact.assert_not_called()
    repository.delete_contacts.assert_not_called()


def test_sync_modifies_contacts_with_id(service, repository):
    owner = Mock()
    existing = _contact(1)
    repository.get_contacts_by_owner.return_value = [existing]

    service.sync_contacts('proveedor', owner, [{'id': 1, 'numero': '1199998888', 'descripcion': 'Puesto'}])

    repository.modify_contact.assert_called_once_with(existing, {'numero': '1199998888', 'descripcion': 'Puesto'})
    repository.create_contact.assert_not_called()
    repository.delete_contacts.assert_not_called()


def test_sync_deletes_contacts_not_received(service, repository):
    owner = Mock()
    kept, removed = _contact(1), _contact(2)
    repository.get_contacts_by_owner.return_value = [kept, removed]

    service.sync_contacts('cliente', owner, [{'id': 1, 'numero': '1111111111'}, {'numero': '1177778888'}])

    repository.delete_contacts.assert_called_once_with([2])
    repository.modify_contact.assert_called_once_with(kept, {'numero': '1111111111'})
    repository.create_contact.assert_called_once_with('cliente', owner, {'numero': '1177778888'})


def test_sync_does_not_mutate_received_data(service, repository):
    repository.get_contacts_by_owner.return_value = [_contact(1)]
    contacts_data = [{'id': 1, 'numero': '1111111111'}]

    service.sync_contacts('cliente', Mock(), contacts_data)

    assert contacts_data == [{'id': 1, 'numero': '1111111111'}]


def test_sync_without_contacts_raises(service, repository):
    with pytest.raises(ContactRequiredException):
        service.sync_contacts('cliente', Mock(), [])

    repository.get_contacts_by_owner.assert_not_called()
    repository.delete_contacts.assert_not_called()


def test_sync_with_id_of_other_owner_raises(service, repository):
    repository.get_contacts_by_owner.return_value = [_contact(1)]

    with pytest.raises(ContactNotFoundException):
        service.sync_contacts('cliente', Mock(), [{'id': 99, 'numero': '1111111111'}])

    repository.delete_contacts.assert_not_called()
    repository.modify_contact.assert_not_called()
    repository.create_contact.assert_not_called()
