from .models import Contacto
from .interfaces import IContactRepository


class ContactRepository(IContactRepository):
    '''
    `owner_field` es el nombre de la FK del dueño ('cliente' o 'proveedor', ver constants.py).
    '''

    def get_contacts_by_owner(self, owner_field, owner):
        return Contacto.objects.filter(**{owner_field: owner})

    def create_contact(self, owner_field, owner, data):
        return Contacto.objects.create(**{owner_field: owner}, **data)

    def modify_contact(self, contact, data):
        for key, value in data.items():
            setattr(contact, key, value)
        contact.save()
        return contact

    def delete_contacts(self, contact_ids):
        Contacto.objects.filter(id__in=contact_ids).delete()
