from abc import ABC, abstractmethod


class IContactRepository(ABC):

    @abstractmethod
    def get_contacts_by_owner(self, owner_field, owner):
        pass

    @abstractmethod
    def create_contact(self, owner_field, owner, data):
        pass

    @abstractmethod
    def modify_contact(self, contact, data):
        pass

    @abstractmethod
    def delete_contacts(self, contact_ids):
        pass
