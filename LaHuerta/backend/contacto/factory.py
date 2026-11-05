from .repositories import ContactRepository
from .service import ContactService


def build_contact_service(contact_repository=None):
    return ContactService(contact_repository=contact_repository or ContactRepository())
