from django.db import transaction
from .interfaces import IBillRepository
from cliente.interfaces import IClientRepository
from factura_producto.interfaces import IBillProductRepository
from .exceptions import BillNotFoundException
from decimal import Decimal

UNIT_SALE = 'unidad'
BULK_SALE = 'bulto'

class BillService:

    def __init__(self, 
    bill_repository: IBillRepository, 
    bill_product_repository: IBillProductRepository,
    client_repository: IClientRepository
    ):
        self.bill_repository = bill_repository
        self.bill_product_repository = bill_product_repository
        self.client_repository = client_repository

    @transaction.atomic
    def create_bill(self, data: dict):
        products = data.pop('items')

        amount = self._calculate_total_amount(products)

        #* Creación de factura
        factura = self.bill_repository.create(
            client=data['cliente'],
            bill_type=data['tipo_factura'],
            date=data['fecha'],
            amount=amount
        )

        #* Creación de producto en factura
        self.bill_product_repository.create_products(factura, products)

        #* Actualización de cuenta corriente del cliente
        cliente = data['cliente']
        cliente.cuenta_corriente += amount
        self.client_repository.update_balance(cliente)

        return factura

    @transaction.atomic
    def update_bill(self, bill_id: int, data: dict):

        bill = self.bill_repository.get_by_id(bill_id)
        if not bill:
            raise BillNotFoundException('Factura no encontrada.')

        old_total_amount = bill.importe
        old_client = bill.cliente

        #* Posible cambio de cliente
        new_client = data.get('cliente', old_client)

        #* Campos simples
        if 'fecha' in data:
            bill.fecha = data['fecha']

        if 'tipo_factura' in data:
            bill.tipo_factura = data['tipo_factura']

        #* Recalculo si hay items en la factura
        products = data.get('items', None)

        if products is not None:
            new_total_amount = self._calculate_total_amount(products)
            bill.importe = new_total_amount
            self.bill_product_repository.replace_products(bill, products)
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

        total_amount = bill.importe
        client = bill.cliente

        #* Ajuste de cuenta corriente del cliente
        client.cuenta_corriente -= total_amount
        self.client_repository.update_balance(client)

        #* Eliminación de productos en factura automática por ser ON_CASCADE
        #* Eliminación de factura
        self.bill_repository.delete(bill)

    def _calculate_total_amount(self, products: list[dict]) -> Decimal:
        total = Decimal('0.00')

        for product in products:
            quantity = product['cantidad']
            sale_type = product['tipo_venta']

            if sale_type.descripcion.lower() == UNIT_SALE:
                subtotal = quantity * product['precio_unitario']
            else:
                subtotal = quantity * product['precio_bulto']

            total += subtotal

        return total

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

            return