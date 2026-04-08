from .repositories import ClientPaymentRepository
from .interfaces import IClientPaymentRepository
from .service import ClientPaymentService

from cliente.repositories import ClientRepository
from cliente.interfaces import IClientRepository
from cheque.repositories import CheckRepository
from cheque.interfaces import ICheckRepository


def build_client_payment_service(
    payment_repository: IClientPaymentRepository | None = None,
    client_repository: IClientRepository | None = None,
    check_repository: ICheckRepository | None = None,
):
    payment_repository = payment_repository or ClientPaymentRepository()
    client_repository = client_repository or ClientRepository()
    check_repository = check_repository or CheckRepository()

    return ClientPaymentService(
        payment_repository=payment_repository,
        client_repository=client_repository,
        check_repository=check_repository,
    )
