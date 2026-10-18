from .repositories import EmptyMovementRepository
from .interfaces import IEmptyMovementRepository
from .service import EmptyMovementService

from proveedor.repositories import SupplierRepository
from proveedor.interfaces import ISupplierRepository


def build_empty_movement_service(
    empty_movement_repository: IEmptyMovementRepository | None = None,
    supplier_repository: ISupplierRepository | None = None,
):
    empty_movement_repository = empty_movement_repository or EmptyMovementRepository()
    supplier_repository = supplier_repository or SupplierRepository()

    return EmptyMovementService(
        empty_movement_repository=empty_movement_repository,
        supplier_repository=supplier_repository,
    )
