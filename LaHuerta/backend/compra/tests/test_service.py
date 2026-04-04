import pytest
from decimal import Decimal
from unittest.mock import Mock

from compra.service import BuyService
from compra.interfaces import IBuyRepository
from compra.exceptions import BuyNotFoundException
from compra_producto.interfaces import IBuyProductRepository
from proveedor.interfaces import ISupplierRepository


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_buy(importe, senia=Decimal('0'), total_payments=None):
    buy = Mock(spec=[])
    buy.importe = importe
    buy.senia = senia
    if total_payments is not None:
        buy.total_payments = total_payments
    else:
        buy.pagocompra_set = Mock()
        buy.pagocompra_set.aggregate = Mock(return_value={'total': Decimal('0')})
    return buy


# ── Tests: calculate_payment_status ───────────────────────────────────────────

class TestCalculatePaymentStatus:

    def test_sin_pagos_ni_senia_retorna_pendiente(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('0'))
        assert BuyService.calculate_payment_status(buy) == 'PENDIENTE'

    def test_pago_parcial_retorna_parcial(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('500.00'))
        assert BuyService.calculate_payment_status(buy) == 'PARCIAL'

    def test_pago_completo_retorna_abonado(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('1000.00'))
        assert BuyService.calculate_payment_status(buy) == 'ABONADO'

    def test_senia_cubre_todo_retorna_abonado(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('1000.00'), total_payments=Decimal('0'))
        assert BuyService.calculate_payment_status(buy) == 'ABONADO'

    def test_senia_parcial_retorna_parcial(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('300.00'), total_payments=Decimal('0'))
        assert BuyService.calculate_payment_status(buy) == 'PARCIAL'

    def test_senia_mas_pagos_cubren_todo_retorna_abonado(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('400.00'), total_payments=Decimal('600.00'))
        assert BuyService.calculate_payment_status(buy) == 'ABONADO'


# ── Tests: calculate_outstanding_balance ──────────────────────────────────────

class TestCalculateOutstandingBalance:

    def test_sin_pagos_retorna_importe_completo(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('0'))
        assert BuyService.calculate_outstanding_balance(buy) == Decimal('1000.00')

    def test_pago_parcial_retorna_diferencia(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('300.00'))
        assert BuyService.calculate_outstanding_balance(buy) == Decimal('700.00')

    def test_pago_completo_retorna_cero(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('1000.00'))
        assert BuyService.calculate_outstanding_balance(buy) == Decimal('0')

    def test_overpaid_nunca_retorna_negativo(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('0'), total_payments=Decimal('1200.00'))
        assert BuyService.calculate_outstanding_balance(buy) == Decimal('0')

    def test_senia_reduce_saldo(self):
        buy = _make_buy(importe=Decimal('1000.00'), senia=Decimal('250.00'), total_payments=Decimal('0'))
        assert BuyService.calculate_outstanding_balance(buy) == Decimal('750.00')


# ── Fake repos ─────────────────────────────────────────────────────────────────

class FakeBuyRepo(IBuyRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1
        self._saved = []
        self._deleted = []

    def get_all(self, proveedor_id=None, fecha_desde=None, fecha_hasta=None, importe_min=None, importe_max=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, proveedor, fecha, importe, senia):
        buy = Mock()
        buy.id = self._next_id
        self._next_id += 1
        buy.proveedor = proveedor
        buy.fecha = fecha
        buy.importe = importe
        buy.senia = senia
        self._items[buy.id] = buy
        return buy

    def save(self, buy):
        self._saved.append(buy)
        return buy

    def delete(self, buy):
        self._items.pop(buy.id, None)
        self._deleted.append(buy)


class FakeBuyProductRepo(IBuyProductRepository):
    def __init__(self):
        self.created = []
        self.replaced = []

    def create_products(self, buy, products):
        self.created.append((buy, products))

    def replace_products(self, buy, products):
        self.replaced.append((buy, products))


class FakeSupplierRepo(ISupplierRepository):
    def __init__(self):
        self.updated = []

    def get_all_suppliers(self, searchQuery=None, mercado=None): pass
    def get_supplier_by_id(self, id): pass
    def create_supplier(self, data): pass
    def modify_supplier(self, supplier, data): pass
    def delete_supplier(self, supplier): pass

    def update_balance(self, supplier):
        self.updated.append(supplier.cuenta_corriente)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_service():
    return BuyService(
        buy_repository=FakeBuyRepo(),
        buy_product_repository=FakeBuyProductRepo(),
        supplier_repository=FakeSupplierRepo(),
    )


def _make_supplier(cc=Decimal('0')):
    supplier = Mock()
    supplier.cuenta_corriente = cc
    return supplier


def _make_products(*prices):
    return [{'cantidad_producto': Decimal('1'), 'precio_bulto': Decimal(str(p))} for p in prices]


# ── Tests: create_buy ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreateBuy:

    def test_importe_es_subtotal_bruto_sin_descontar_senia(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('0'))

        compra = service.create_buy({
            'proveedor': supplier,
            'fecha': '2024-01-01',
            'senia': Decimal('200.00'),
            'items': _make_products(600, 400),  # subtotal = $1000
        })

        assert compra.importe == Decimal('1000.00')

    def test_create_incrementa_cc_por_deuda_neta(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('0'))

        service.create_buy({
            'proveedor': supplier,
            'fecha': '2024-01-01',
            'senia': Decimal('200.00'),
            'items': _make_products(600, 400),  # importe = $1000, deuda neta = $800
        })

        assert supplier.cuenta_corriente == Decimal('800.00')
        assert len(service.supplier_repository.updated) == 1

    def test_create_sin_senia_cc_refleja_importe_completo(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('500.00'))

        service.create_buy({
            'proveedor': supplier,
            'fecha': '2024-01-01',
            'items': _make_products(1000),
        })

        assert supplier.cuenta_corriente == Decimal('1500.00')

    def test_create_llama_create_products(self):
        service = _make_service()
        products = _make_products(500, 300)

        service.create_buy({
            'proveedor': _make_supplier(),
            'fecha': '2024-01-01',
            'items': products,
        })

        assert len(service.buy_product_repository.created) == 1


# ── Tests: update_buy ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUpdateBuy:

    def test_update_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(BuyNotFoundException):
            service.update_buy(999, {'fecha': '2024-02-01'})

    def test_update_nuevo_importe_ajusta_cc(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('1000.00'))
        compra = service.buy_repository.create(
            proveedor=supplier, fecha='2024-01-01',
            importe=Decimal('1000.00'), senia=Decimal('0'),
        )

        service.update_buy(compra.id, {
            'items': _make_products(700),  # nuevo importe = $700
        })

        # diferencia = $700 - $1000 = -$300 → CC baja $300
        assert supplier.cuenta_corriente == Decimal('700.00')

    def test_update_nueva_senia_ajusta_cc(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('1000.00'))
        compra = service.buy_repository.create(
            proveedor=supplier, fecha='2024-01-01',
            importe=Decimal('1000.00'), senia=Decimal('0'),
        )

        service.update_buy(compra.id, {
            'senia': Decimal('200.00'),  # seña sube → deuda neta baja $200
        })

        assert supplier.cuenta_corriente == Decimal('800.00')

    def test_update_cambio_de_proveedor_transfiere_deuda(self):
        service = _make_service()
        old_supplier = _make_supplier(cc=Decimal('1000.00'))
        new_supplier = _make_supplier(cc=Decimal('0'))
        compra = service.buy_repository.create(
            proveedor=old_supplier, fecha='2024-01-01',
            importe=Decimal('1000.00'), senia=Decimal('0'),
        )

        service.update_buy(compra.id, {'proveedor': new_supplier})

        assert old_supplier.cuenta_corriente == Decimal('0')
        assert new_supplier.cuenta_corriente == Decimal('1000.00')

    def test_update_sin_cambios_no_modifica_cc(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('1000.00'))
        compra = service.buy_repository.create(
            proveedor=supplier, fecha='2024-01-01',
            importe=Decimal('1000.00'), senia=Decimal('0'),
        )
        calls_before = len(service.supplier_repository.updated)

        service.update_buy(compra.id, {'fecha': '2024-03-01'})

        assert len(service.supplier_repository.updated) == calls_before


# ── Tests: delete_buy ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeleteBuy:

    def test_delete_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(BuyNotFoundException):
            service.delete_buy(999)

    def test_delete_revierte_deuda_neta_del_proveedor(self):
        service = _make_service()
        supplier = _make_supplier(cc=Decimal('800.00'))
        compra = service.buy_repository.create(
            proveedor=supplier, fecha='2024-01-01',
            importe=Decimal('1000.00'), senia=Decimal('200.00'),
        )

        service.delete_buy(compra.id)

        # deuda neta = $1000 - $200 = $800 → CC vuelve a $0
        assert supplier.cuenta_corriente == Decimal('0')

    def test_delete_elimina_la_compra(self):
        service = _make_service()
        compra = service.buy_repository.create(
            proveedor=_make_supplier(), fecha='2024-01-01',
            importe=Decimal('500.00'), senia=Decimal('0'),
        )
        buy_id = compra.id

        service.delete_buy(buy_id)

        assert service.buy_repository.get_by_id(buy_id) is None
