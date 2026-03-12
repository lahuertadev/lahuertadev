from .repositories import BillRepository
from .interfaces import IBillRepository

from factura_producto.repositories import BillProductRepository
from factura_producto.interfaces import IBillProductRepository

from cliente.repositories import ClientRepository
from cliente.interfaces import IClientRepository

from lista_precios_producto.repositories import ProductPriceListRepository
from lista_precios_producto.interfaces import IProductPriceListRepository

from .service import BillService


def build_bill_service(
    bill_repository: IBillRepository | None = None,
    bill_product_repository: IBillProductRepository | None = None,
    client_repository: IClientRepository | None = None,
    price_list_product_repository: IProductPriceListRepository | None = None,
):
    bill_repository = bill_repository or BillRepository()
    bill_product_repository = bill_product_repository or BillProductRepository()
    client_repository = client_repository or ClientRepository()
    price_list_product_repository = price_list_product_repository or ProductPriceListRepository()

    return BillService(
        bill_repository=bill_repository,
        bill_product_repository=bill_product_repository,
        client_repository=client_repository,
        price_list_product_repository=price_list_product_repository,
    )
