from django.db import transaction
from decimal import Decimal
from .interfaces import IBuyRepository
from .exceptions import BuyNotFoundException
from compra_producto.interfaces import IBuyProductRepository
from proveedor.interfaces import ISupplierRepository


class BuyService:

    def __init__(
        self,
        buy_repository: IBuyRepository,
        buy_product_repository: IBuyProductRepository,
        supplier_repository: ISupplierRepository,
    ):
        self.buy_repository = buy_repository
        self.buy_product_repository = buy_product_repository
        self.supplier_repository = supplier_repository

    @transaction.atomic
    def create_buy(self, data: dict):
        products = data.pop('items')
        proveedor = data['proveedor']
        senia = Decimal(str(data.get('senia', 0)))

        subtotal = self._calculate_subtotal(products)
        importe = subtotal - senia

        compra = self.buy_repository.create(
            proveedor=proveedor,
            fecha=data['fecha'],
            importe=importe,
            senia=senia,
        )

        self.buy_product_repository.create_products(compra, products)

        proveedor.cuenta_corriente += importe
        self.supplier_repository.update_balance(proveedor)

        return compra

    @transaction.atomic
    def update_buy(self, buy_id: int, data: dict):
        compra = self.buy_repository.get_by_id(buy_id)
        if not compra:
            raise BuyNotFoundException('Compra no encontrada.')

        old_importe = compra.importe
        old_proveedor = compra.proveedor

        new_proveedor = data.get('proveedor', old_proveedor)

        if 'fecha' in data:
            compra.fecha = data['fecha']

        products = data.get('items', None)
        new_senia = Decimal(str(data['senia'])) if 'senia' in data else compra.senia

        if products is not None:
            subtotal = self._calculate_subtotal(products)
            new_importe = subtotal - new_senia
            compra.importe = new_importe
            compra.senia = new_senia
            self.buy_product_repository.replace_products(compra, products)
        else:
            if 'senia' in data:
                # Solo cambió la seña: recalcular importe manteniendo el subtotal
                old_subtotal = old_importe + compra.senia
                new_importe = old_subtotal - new_senia
                compra.importe = new_importe
                compra.senia = new_senia
            else:
                new_importe = old_importe

        self._adjust_supplier_balance(old_proveedor, new_proveedor, old_importe, new_importe)

        compra.proveedor = new_proveedor
        self.buy_repository.save(compra)

        return compra

    @transaction.atomic
    def delete_buy(self, buy_id: int):
        compra = self.buy_repository.get_by_id(buy_id)
        if not compra:
            raise BuyNotFoundException('Compra no encontrada.')

        importe = compra.importe
        proveedor = compra.proveedor

        proveedor.cuenta_corriente -= importe
        self.supplier_repository.update_balance(proveedor)

        # Eliminación de ítems automática por CASCADE
        self.buy_repository.delete(compra)

    def _calculate_subtotal(self, products: list[dict]) -> Decimal:
        return sum(
            Decimal(str(product['cantidad_producto'])) * Decimal(str(product['precio_bulto']))
            for product in products
        )

    def _adjust_supplier_balance(self, old_proveedor, new_proveedor, old_importe: Decimal, new_importe: Decimal) -> None:
        proveedor_changed = old_proveedor != new_proveedor
        importe_changed = old_importe != new_importe

        if proveedor_changed:
            old_proveedor.cuenta_corriente -= old_importe
            self.supplier_repository.update_balance(old_proveedor)

            new_proveedor.cuenta_corriente += new_importe
            self.supplier_repository.update_balance(new_proveedor)

            return

        if importe_changed:
            difference = new_importe - old_importe
            old_proveedor.cuenta_corriente += difference
            self.supplier_repository.update_balance(old_proveedor)
