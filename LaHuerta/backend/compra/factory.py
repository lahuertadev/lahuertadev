from .repositories import BuyRepository
from .interfaces import IBuyRepository
from .service import BuyService

from compra_producto.repositories import BuyProductRepository
from compra_producto.interfaces import IBuyProductRepository

from proveedor.repositories import SupplierRepository
from proveedor.interfaces import ISupplierRepository


def build_buy_service(
    buy_repository: IBuyRepository | None = None,
    buy_product_repository: IBuyProductRepository | None = None,
    supplier_repository: ISupplierRepository | None = None,
):
    buy_repository = buy_repository or BuyRepository()
    buy_product_repository = buy_product_repository or BuyProductRepository()
    supplier_repository = supplier_repository or SupplierRepository()

    return BuyService(
        buy_repository=buy_repository,
        buy_product_repository=buy_product_repository,
        supplier_repository=supplier_repository,
    )
