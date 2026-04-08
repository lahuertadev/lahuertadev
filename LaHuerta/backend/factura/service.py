from django.db import transaction
from .interfaces import IBillRepository
from cliente.interfaces import IClientRepository
from factura_producto.interfaces import IBillProductRepository
from lista_precios_producto.interfaces import IProductPriceListRepository
from .exceptions import (
    BillNotFoundException,
    BillHasPaymentsException,
    PriceNotFoundError,
    )
from decimal import Decimal



class BillService:

    def __init__(self,
        bill_repository: IBillRepository,
        bill_product_repository: IBillProductRepository,
        client_repository: IClientRepository,
        price_list_product_repository: IProductPriceListRepository,
    ):
        self.bill_repository = bill_repository
        self.bill_product_repository = bill_product_repository
        self.client_repository = client_repository
        self.price_list_product_repository = price_list_product_repository

    @transaction.atomic
    def create_bill(self, data: dict):
        products = data.pop('items')
        client = data['cliente']

        products_with_price = self._resolve_prices(client, products)
        amount = self._calculate_total_amount(products_with_price)

        factura = self.bill_repository.create(
            client=client,
            bill_type=data['tipo_factura'],
            date=data['fecha'],
            amount=amount
        )

        self.bill_product_repository.create_products(factura, products_with_price)

        client.cuenta_corriente += amount
        self.client_repository.update_balance(client)

        return factura

    @transaction.atomic
    def update_bill(self, bill_id: int, data: dict):

        bill = self.bill_repository.get_by_id(bill_id)
        if not bill:
            raise BillNotFoundException('Factura no encontrada.')

        old_total_amount = bill.importe
        old_client = bill.cliente

        new_client = data.get('cliente', old_client)

        if 'fecha' in data:
            bill.fecha = data['fecha']

        if 'tipo_factura' in data:
            bill.tipo_factura = data['tipo_factura']

        products = data.get('items', None)

        if products is not None:
            products_with_price = self._resolve_prices(new_client, products)
            new_total_amount = self._calculate_total_amount(products_with_price)
            bill.importe = new_total_amount
            self.bill_product_repository.replace_products(bill, products_with_price)
        else:
            new_total_amount = old_total_amount

        self._adjust_client_balance(old_client, new_client, old_total_amount, new_total_amount)

        bill.cliente = new_client
        self.bill_repository.save(bill)

        return bill

    @transaction.atomic
    def delete_bill(self, bill_id: int):

        bill = self.bill_repository.get_by_id(bill_id)
        if not bill:
            raise BillNotFoundException('Factura no encontrada.')

        if bill.pagofactura_set.exists():
            raise BillHasPaymentsException(
                'La factura tiene pagos asociados. '
                'Eliminá las imputaciones antes de continuar.'
            )

        total_amount = bill.importe
        client = bill.cliente

        client.cuenta_corriente -= total_amount
        self.client_repository.update_balance(client)

        #* Eliminación de productos en factura automática por ser ON_CASCADE
        #* Eliminación de factura
        self.bill_repository.delete(bill)

    def _resolve_prices(self, client, products: list[dict]) -> list[dict]:
        """
        Para cada ítem, busca el precio en ListaPreciosProducto según la lista
        activa del cliente y el tipo_venta seleccionado. Agrega precio_aplicado.
        """
        if not client.lista_precios_id:
            raise PriceNotFoundError(
                f'El cliente {client.razon_social} no tiene lista de precios asignada.'
            )

        enriched = []
        for product in products:
            entry = self.price_list_product_repository.get_by_product_and_sale_type(
                price_list_id=client.lista_precios_id,
                product_id=product['producto'].id,
                sale_type_id=product['tipo_venta'].id,
            )

            if not entry:
                raise PriceNotFoundError(
                    f'No se encontró precio para el producto "{product["producto"]}" '
                    f'con tipo de venta "{product["tipo_venta"]}" '
                    f'en la lista de precios del cliente.'
                )

            enriched.append({**product, 'precio_aplicado': entry.precio})

        return enriched

    def _calculate_total_amount(self, products: list[dict]) -> Decimal:
        return sum(
            product['cantidad'] * product['precio_aplicado']
            for product in products
        )

    def _adjust_client_balance(self, old_client, new_client, old_amount: Decimal, new_amount: Decimal) -> None:
        '''
        Ajusta la cuenta corriente del cliente.
        '''
        client_changed = old_client != new_client
        amount_changed = old_amount != new_amount

        if client_changed:
            old_client.cuenta_corriente -= old_amount
            self.client_repository.update_balance(old_client)

            new_client.cuenta_corriente += new_amount
            self.client_repository.update_balance(new_client)

            return

        if amount_changed:
            difference = new_amount - old_amount
            old_client.cuenta_corriente += difference
            self.client_repository.update_balance(old_client)
