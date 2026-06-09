from django.db import transaction
from .interfaces import IBillRepository
from cliente.interfaces import IClientRepository
from factura_producto.interfaces import IBillProductRepository
from lista_precios_producto.interfaces import IProductPriceListRepository
from .exceptions import (
    BillNotFoundException,
    BillHasPaymentsException,
    BillAlreadyEmittedException,
    PriceNotFoundError,
    DebitNoteValidationError,
    )
from arca.service import ARCAService
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError
from decimal import Decimal, ROUND_HALF_UP
from .constants import DEBIT_NOTE_CODES, DEBIT_NOTE_TO_INVOICE_CODE, MANUAL_PRICE_CODES, AFIP_IVA_CODES
from collections import defaultdict


class BillService:

    def __init__(self,
        bill_repository: IBillRepository,
        bill_product_repository: IBillProductRepository,
        client_repository: IClientRepository,
        price_list_product_repository: IProductPriceListRepository,
        arca_service: ARCAService = None,
    ):
        self.bill_repository = bill_repository
        self.bill_product_repository = bill_product_repository
        self.client_repository = client_repository
        self.price_list_product_repository = price_list_product_repository
        self.arca_service = arca_service or ARCAService(homologacion=True)

    @transaction.atomic
    def create_bill(self, data: dict):
        products = data.pop('items')
        client = data['cliente']
        associated_bill = data.get('factura_asociada')
        bill_type = data['tipo_factura']

        if bill_type.codigo_afip in DEBIT_NOTE_CODES:
            self._validate_debit_note(bill_type, associated_bill)

        if bill_type.codigo_afip in MANUAL_PRICE_CODES:
            products_with_price = self._use_manual_prices(products)
        else:
            products_with_price = self._resolve_prices(client, products)

        subtotal = self._calculate_total_amount(products_with_price)
        total = self._compute_total(products_with_price, bill_type)

        bill = self.bill_repository.create(
            client=client,
            bill_type=bill_type,
            date=data['fecha'],
            subtotal=subtotal,
            total=total,
            associated_bill=associated_bill,
        )

        self.bill_product_repository.create_products(bill, products_with_price)

        client.cuenta_corriente += total
        self.client_repository.update_balance(client)

        if bill_type.codigo_afip is not None:
            try:
                cbte_asoc = None
                if associated_bill:
                    cbte_asoc = {
                        'tipo': associated_bill.tipo_factura.codigo_afip,
                        'nro': associated_bill.numero_comprobante,
                    }
                arca_result = self.arca_service.emit_receipt(
                    tipo_cbte=bill_type.codigo_afip,
                    importe_total=float(total),
                    importe_neto=float(subtotal),
                    iva_breakdown=self._build_iva_breakdown(products_with_price),
                    fecha=data['fecha'],
                    cuit_receptor=client.cuit,
                    condicion_iva_receptor_id=client.condicion_IVA.codigo_afip,
                    cbte_asoc=cbte_asoc,
                )
                bill.numero_comprobante = arca_result['numero_comprobante']
                bill.cae = arca_result['cae']
                bill.cae_vto = arca_result['cae_vto']
                self.bill_repository.save(bill)
            except (WSAAAuthenticationError, WSFEEmissionError):
                raise
        else:
            last_number = self.bill_repository.get_last_receipt_number(bill_type.id)
            bill.numero_comprobante = last_number + 1
            self.bill_repository.save(bill)

        return bill

    @transaction.atomic
    def update_bill(self, bill_id: int, data: dict):

        bill = self.bill_repository.get_by_id(bill_id)
        if not bill:
            raise BillNotFoundException('Factura no encontrada.')

        if bill.cae:
            raise BillAlreadyEmittedException(
                'La factura ya fue emitida por AFIP y no puede modificarse.'
            )

        old_total_amount = bill.total
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
            bill.subtotal = new_total_amount
            bill.total = new_total_amount
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

        if bill.cae:
            raise BillAlreadyEmittedException(
                'La factura ya fue emitida por AFIP y no puede eliminarse.'
            )

        if bill.pagofactura_set.exists():
            raise BillHasPaymentsException(
                'La factura tiene pagos asociados. '
                'Eliminá las imputaciones antes de continuar.'
            )

        total_amount = bill.total
        client = bill.cliente

        client.cuenta_corriente -= total_amount
        self.client_repository.update_balance(client)

        self.bill_repository.delete(bill)

    def _validate_debit_note(self, bill_type, associated_bill):
        if not associated_bill:
            raise DebitNoteValidationError(
                'Las Notas de Débito deben referenciar una factura original.'
            )
        if not associated_bill.cae:
            raise DebitNoteValidationError(
                'La factura asociada debe estar emitida por AFIP.'
            )
        expected_invoice_code = DEBIT_NOTE_TO_INVOICE_CODE.get(bill_type.codigo_afip)
        if associated_bill.tipo_factura.codigo_afip != expected_invoice_code:
            raise DebitNoteValidationError(
                f'Tipo incompatible: una {bill_type.descripcion} solo puede asociarse '
                f'a una factura de tipo {associated_bill.tipo_factura.descripcion}.'
            )
        
    def _use_manual_prices(self, products: list[dict]) -> list[dict]:
        for product in products:
            if not product.get('precio_aplicado'):
                raise PriceNotFoundError(
                    f'El producto "{product["producto"]}" no tiene precio ingresado. '
                    'Para Notas de Débito y Crédito el precio debe ingresarse manualmente.'
                )
        return products

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

    def _compute_total(self, products: list[dict], bill_type) -> Decimal:
        """
        Calcula el importe total del comprobante con IVA incluido.
        Para remitos (sin codigo_afip) devuelve el subtotal sin aplicar IVA.
        Para comprobantes electrónicos aplica la alícuota de cada ítem por separado,
        """
        if bill_type.codigo_afip is None:
            return self._calculate_total_amount(products)
        total = Decimal('0')
        for product in products:
            item_net = product['cantidad'] * product['precio_aplicado']
            rate = Decimal(str(product.get('iva_rate', '10.5')))
            total += item_net * (1 + rate / 100)
        return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def _build_iva_breakdown(self, products: list[dict]) -> list[dict]:
        """
        Agrupa los ítems por alícuota de IVA y devuelve el detalle que AFIP
        requiere en AgregarIva: código de tasa, base imponible e importe de IVA.
        """
        
        groups = defaultdict(lambda: {'base': Decimal('0'), 'amount': Decimal('0')})
        for product in products:
            item_net = product['cantidad'] * product['precio_aplicado']
            rate = Decimal(str(product.get('iva_rate', '10.5')))
            iva_amount = (item_net * rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            iva_id = AFIP_IVA_CODES.get(rate, 4)
            groups[iva_id]['base'] += item_net
            groups[iva_id]['amount'] += iva_amount
        return [
            {'iva_id': iva_id, 'base_imp': float(v['base']), 'importe': float(v['amount'])}
            for iva_id, v in groups.items()
        ]

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
