from .repositories import ClientPaymentRepository
from .interfaces import IClientPaymentRepository
from .service import ClientPaymentService

from cliente.repositories import ClientRepository
from cliente.interfaces import IClientRepository


def build_client_payment_service(
    payment_repository: IClientPaymentRepository | None = None,
    client_repository: IClientRepository | None = None,
):
    payment_repository = payment_repository or ClientPaymentRepository()
    client_repository = client_repository or ClientRepository()

    return ClientPaymentService(
        payment_repository=payment_repository,
        client_repository=client_repository,
    )
