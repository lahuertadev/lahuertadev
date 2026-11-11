from .constants import MIN_CONTACTS
from .exceptions import ContactNotFoundException, ContactRequiredException


class ContactService:

    def __init__(self, contact_repository):
        self.contact_repository = contact_repository

    def sync_contacts(self, owner_field, owner, contacts_data):
        '''
        Deja al dueño (cliente o proveedor) con los contactos recibidos: modifica los que llegan
        con id, crea los que llegan sin id y elimina los que ya no están. La vista del dueño lo
        llama dentro de la misma transacción en la que lo guarda.
        '''
        if len(contacts_data) < MIN_CONTACTS:
            raise ContactRequiredException('Cargá al menos un contacto.')

        current_contacts = {
            contact.id: contact
            for contact in self.contact_repository.get_contacts_by_owner(owner_field, owner)
        }
        received_ids = {data['id'] for data in contacts_data if data.get('id')}
        if received_ids - current_contacts.keys():
            raise ContactNotFoundException('Contacto no encontrado.')

        removed_ids = [contact_id for contact_id in current_contacts if contact_id not in received_ids]
        if removed_ids:
            self.contact_repository.delete_contacts(removed_ids)

        for data in contacts_data:
            data = dict(data)
            contact_id = data.pop('id', None)
            if contact_id:
                self.contact_repository.modify_contact(current_contacts[contact_id], data)
            else:
                self.contact_repository.create_contact(owner_field, owner, data)
