from django.db import transaction
from decimal import Decimal
from .interfaces import IBuyRepository
from .exceptions import BuyNotFoundException
from compra_producto.interfaces import IBuyProductRepository
from compra_vacio.interfaces import IBuyEmptyRepository
from proveedor.interfaces import ISupplierRepository

# Estados de pago de una compra
PAYMENT_STATUS_PENDING = 'PENDIENTE'
PAYMENT_STATUS_PARTIAL = 'PARCIAL'
PAYMENT_STATUS_PAID    = 'ABONADO'


class BuyService:

    def __init__(
        self,
        buy_repository: IBuyRepository,
        buy_product_repository: IBuyProductRepository,
        buy_empty_repository: IBuyEmptyRepository,
        supplier_repository: ISupplierRepository,
    ):
        self.buy_repository = buy_repository
        self.buy_product_repository = buy_product_repository
        self.buy_empty_repository = buy_empty_repository
        self.supplier_repository = supplier_repository

    @transaction.atomic
    def create_buy(self, data: dict):
        products = data.pop('items')
        empties = data.pop('vacios', [])
        supplier = data['proveedor']
        sign = Decimal(str(data.get('senia', 0)))

        amount = self._calculate_subtotal(products)

        buy = self.buy_repository.create(
            proveedor=supplier,
            fecha=data['fecha'],
            importe=amount,
            senia=sign,
        )

        self.buy_product_repository.create_products(buy, products)
        self.buy_empty_repository.create_empties(buy, empties)

        # La CC refleja la deuda neta: importe total menos la seña ya abonada.
        supplier.cuenta_corriente += amount - sign
        self.supplier_repository.update_balance(supplier)

        return buy

    @transaction.atomic
    def update_buy(self, buy_id: int, data: dict):
        compra = self.buy_repository.get_by_id(buy_id)
        if not compra:
            raise BuyNotFoundException('Compra no encontrada.')

        old_importe = compra.importe
        old_senia   = compra.senia
        old_proveedor = compra.proveedor

        new_proveedor = data.get('proveedor', old_proveedor)
        new_senia = Decimal(str(data['senia'])) if 'senia' in data else old_senia

        if 'fecha' in data:
            compra.fecha = data['fecha']

        products = data.get('items', None)
        empties = data.get('vacios', None)

        if products is not None:
            # Importe es siempre el total bruto de la factura (sin descontar seña).
            new_importe = self._calculate_subtotal(products)
            compra.importe = new_importe
            self.buy_product_repository.replace_products(compra, products)
        else:
            new_importe = old_importe

        if empties is not None:
            self.buy_empty_repository.replace_empties(compra, empties)

        compra.senia = new_senia

        # _adjust_supplier_balance trabaja con deudas netas (importe - seña).
        self._adjust_supplier_balance(
            old_proveedor, new_proveedor,
            old_importe - old_senia,
            new_importe - new_senia,
        )

        compra.proveedor = new_proveedor
        self.buy_repository.save(compra)

        return compra

    @transaction.atomic
    def delete_buy(self, buy_id: int):
        compra = self.buy_repository.get_by_id(buy_id)
        if not compra:
            raise BuyNotFoundException('Compra no encontrada.')

        proveedor = compra.proveedor

        # Revertir solo la deuda neta que se había acreditado al crear la compra.
        proveedor.cuenta_corriente -= (compra.importe - compra.senia)
        self.supplier_repository.update_balance(proveedor)

        # Eliminación de ítems automática por CASCADE
        self.buy_repository.delete(compra)

    @staticmethod
    def _calculate_total_paid(buy) -> Decimal:
        '''
        Suma la seña más todos los pagos registrados para la compra.
        Usa la annotation total_payments del repositorio si está disponible;
        si no, cae en una query directa.
        '''
        payments = getattr(buy, 'total_payments', None)
        if payments is None:
            from django.db.models import Sum
            payments = buy.pagocompra_set.aggregate(
                total=Sum('importe_abonado')
            )['total'] or Decimal('0')
        return Decimal(str(payments)) + Decimal(str(buy.senia))

    @staticmethod
    def calculate_payment_status(buy) -> str:
        '''
        Clasifica el estado de pago según cuánto se abonó del importe total.
        '''
        
        total_paid = BuyService._calculate_total_paid(buy)
        amount = Decimal(str(buy.importe))
        if total_paid <= 0:
            return PAYMENT_STATUS_PENDING
        if total_paid >= amount:
            return PAYMENT_STATUS_PAID
        return PAYMENT_STATUS_PARTIAL

    @staticmethod
    def calculate_outstanding_balance(buy) -> Decimal:
        '''
        Calcula el saldo pendiente. Nunca retorna negativo.
        '''

        balance = Decimal(str(buy.importe)) - BuyService._calculate_total_paid(buy)
        return max(balance, Decimal('0'))

    def _calculate_subtotal(self, products: list[dict]) -> Decimal:
        '''
        Calcula el subtotal
        '''

        return sum(
            Decimal(str(product['cantidad_producto'])) * Decimal(str(product['precio_bulto']))
            for product in products
        )

    def _adjust_supplier_balance(self, old_proveedor, new_proveedor, old_debt: Decimal, new_debt: Decimal) -> None:
        proveedor_changed = old_proveedor != new_proveedor
        debt_changed = old_debt != new_debt

        if proveedor_changed:
            old_proveedor.cuenta_corriente -= old_debt
            self.supplier_repository.update_balance(old_proveedor)

            new_proveedor.cuenta_corriente += new_debt
            self.supplier_repository.update_balance(new_proveedor)

            return

        if debt_changed:
            difference = new_debt - old_debt
            old_proveedor.cuenta_corriente += difference
            self.supplier_repository.update_balance(old_proveedor)
