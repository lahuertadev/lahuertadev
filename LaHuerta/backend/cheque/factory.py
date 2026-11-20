from .repositories import CheckRepository
from .service import CheckService
from cliente.repositories import ClientRepository
from proveedor.repositories import SupplierRepository
from pago_compra.repositories import PurchasePaymentRepository


def build_check_service(check_repository=None):
    check_repository = check_repository or CheckRepository()
    return CheckService(
        check_repository=check_repository,
        client_repository=ClientRepository(),
        supplier_repository=SupplierRepository(),
        payment_repository=PurchasePaymentRepository(),
    )
