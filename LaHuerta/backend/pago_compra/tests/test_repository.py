import pytest
from decimal import Decimal

from core.tests.factories import make_own_check, make_payment_type, make_purchase, make_purchase_payment, make_supplier
from pago_compra.models import PagoCompra
from pago_compra.repositories import PurchasePaymentRepository


@pytest.mark.django_db
class TestPurchasePaymentRepository:

    def setup_method(self):
        self.repo = PurchasePaymentRepository()
        self.supplier = make_supplier(nombre='Ricardo', puesto=27)
        self.other_supplier = make_supplier(nombre='Otro', puesto=3)
        self.buy = make_purchase(fecha='2026-10-22', importe=Decimal('670000.00'), proveedor=self.supplier)
        self.payment_type = make_payment_type(descripcion='Efectivo')

    def _create(self, supplier, buy=None, amount=Decimal('1000.00')):
        return self.repo.create(
            proveedor=supplier,
            compra=buy,
            importe_abonado=amount,
            tipo_pago=self.payment_type,
            fecha_pago='2026-10-28',
        )

    def test_create_pago_de_compra(self):
        payment = self._create(self.supplier, buy=self.buy)

        stored = PagoCompra.objects.get(id=payment.id)
        assert stored.proveedor_id == self.supplier.id
        assert stored.compra_id == self.buy.id

    def test_create_pago_a_cuenta_sin_compra(self):
        payment = self._create(self.supplier)

        stored = PagoCompra.objects.get(id=payment.id)
        assert stored.proveedor_id == self.supplier.id
        assert stored.compra_id is None

    def test_get_all_sin_filtros_incluye_pagos_con_y_sin_compra(self):
        self._create(self.supplier, buy=self.buy)
        self._create(self.supplier)

        assert self.repo.get_all().count() == 2

    def test_get_all_filtra_por_compra(self):
        with_buy = self._create(self.supplier, buy=self.buy)
        self._create(self.supplier)

        assert list(self.repo.get_all(compra_id=self.buy.id)) == [with_buy]

    def test_get_all_filtra_por_proveedor(self):
        self._create(self.supplier, buy=self.buy)
        other = self._create(self.other_supplier)

        assert list(self.repo.get_all(supplier_id=self.other_supplier.id)) == [other]

    def test_get_by_id_inexistente_devuelve_none(self):
        assert self.repo.get_by_id(9999) is None

    def test_update_cambia_importe_y_fecha(self):
        payment = self._create(self.supplier, buy=self.buy)

        self.repo.update(payment, {'importe_abonado': Decimal('2500.00'), 'fecha_pago': '2026-10-30'})

        stored = PagoCompra.objects.get(id=payment.id)
        assert stored.importe_abonado == Decimal('2500.00')
        assert stored.fecha_pago.isoformat() == '2026-10-30'
        assert stored.compra_id == self.buy.id

    def test_add_own_check_use_guarda_cuanto_se_usa_de_cada_cheque(self):
        payment = self._create(self.supplier, amount=Decimal('1500.00'))
        first = make_own_check(importe=Decimal('1000.00'))
        second = make_own_check(importe=Decimal('2000.00'))

        self.repo.add_own_check_use(payment, first, Decimal('1000.00'))
        self.repo.add_own_check_use(payment, second, Decimal('500.00'))

        stored = self.repo.get_by_id(payment.id)
        assert [(use.cheque_propio_id, use.importe) for use in stored.own_check_uses.all()] == [
            (first.id, Decimal('1000.00')), (second.id, Decimal('500.00')),
        ]
        assert set(first.pagocompra_set.all()) == {payment}

    def test_delete(self):
        payment = self._create(self.supplier)

        self.repo.delete(payment)

        assert not PagoCompra.objects.filter(id=payment.id).exists()



@pytest.mark.django_db
class TestPurchasePaymentRepositoryFilters:
    """Filtros del listado de Pagos de Compras."""

    def setup_method(self):
        self.repo = PurchasePaymentRepository()
        self.ricardo = make_supplier(nombre='Ricardo', puesto=27)
        self.migogus = make_supplier(nombre='Migogus', puesto=21)
        self.cash = make_payment_type(descripcion='Efectivo')
        self.check = make_payment_type(descripcion='Cheque')
        buy = make_purchase(importe=Decimal('900000.00'), proveedor=self.ricardo)
        self.buy_payment = make_purchase_payment(
            proveedor=self.ricardo, compra=buy, tipo_pago=self.cash,
            importe_abonado=Decimal('300000.00'), fecha_pago='2026-10-28',
        )
        self.on_account = make_purchase_payment(
            proveedor=self.ricardo, compra=None, tipo_pago=self.check,
            importe_abonado=Decimal('150000.00'), fecha_pago='2026-10-29',
        )
        self.other = make_purchase_payment(
            proveedor=self.migogus, compra=None, tipo_pago=self.cash,
            importe_abonado=Decimal('50000.00'), fecha_pago='2026-09-24',
        )

    def _ids(self, **filters):
        return [payment.id for payment in self.repo.get_all(**filters)]

    def test_sin_filtros_ordena_del_mas_nuevo_al_mas_viejo(self):
        assert self._ids() == [self.on_account.id, self.buy_payment.id, self.other.id]

    def test_proveedor_por_puesto(self):
        assert self._ids(supplier='21') == [self.other.id]

    def test_proveedor_por_nombre_parcial(self):
        assert self._ids(supplier='ricar') == [self.on_account.id, self.buy_payment.id]

    def test_proveedor_sin_coincidencias(self):
        assert self._ids(supplier='99') == []

    def test_concepto_compra(self):
        assert self._ids(kind='COMPRA') == [self.buy_payment.id]

    def test_concepto_a_cuenta(self):
        assert self._ids(kind='A_CUENTA') == [self.on_account.id, self.other.id]

    def test_tipo_de_pago(self):
        assert self._ids(payment_type_id=self.check.id) == [self.on_account.id]

    def test_importe_minimo_y_maximo(self):
        assert self._ids(amount_min=Decimal('100000.00'), amount_max=Decimal('200000.00')) == [self.on_account.id]

    def test_fecha_desde_y_hasta(self):
        assert self._ids(date_from='2026-10-01', date_to='2026-10-28') == [self.buy_payment.id]

    def test_filtros_combinados(self):
        assert self._ids(supplier='27', kind='A_CUENTA', payment_type_id=self.check.id) == [self.on_account.id]
