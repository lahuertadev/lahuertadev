import pytest
from decimal import Decimal

from core.tests.factories import make_payment_type, make_purchase, make_supplier
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

    def test_delete(self):
        payment = self._create(self.supplier)

        self.repo.delete(payment)

        assert not PagoCompra.objects.filter(id=payment.id).exists()
