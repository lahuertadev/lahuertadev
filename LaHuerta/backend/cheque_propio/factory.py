from pago_compra.repositories import PurchasePaymentRepository
from proveedor.repositories import SupplierRepository
from .repositories import OwnCheckRepository
from .service import OwnCheckService


def build_own_check_service(own_check_repository=None):
    own_check_repository = own_check_repository or OwnCheckRepository()
    payment_repository = PurchasePaymentRepository()
    supplier_repository = SupplierRepository()

    return OwnCheckService(
        own_check_repository=own_check_repository,
        payment_repository=payment_repository,
        supplier_repository=supplier_repository,
    )
