from .repositories import BuyRepository
from .interfaces import IBuyRepository
from .service import BuyService

from compra_producto.repositories import BuyProductRepository
from compra_producto.interfaces import IBuyProductRepository

from compra_vacio.repositories import BuyEmptyRepository
from compra_vacio.interfaces import IBuyEmptyRepository

from proveedor.repositories import SupplierRepository
from proveedor.interfaces import ISupplierRepository


def build_buy_service(
    buy_repository: IBuyRepository | None = None,
    buy_product_repository: IBuyProductRepository | None = None,
    buy_empty_repository: IBuyEmptyRepository | None = None,
    supplier_repository: ISupplierRepository | None = None,
):
    buy_repository = buy_repository or BuyRepository()
    buy_product_repository = buy_product_repository or BuyProductRepository()
    buy_empty_repository = buy_empty_repository or BuyEmptyRepository()
    supplier_repository = supplier_repository or SupplierRepository()

    return BuyService(
        buy_repository=buy_repository,
        buy_product_repository=buy_product_repository,
        buy_empty_repository=buy_empty_repository,
        supplier_repository=supplier_repository,
    )
