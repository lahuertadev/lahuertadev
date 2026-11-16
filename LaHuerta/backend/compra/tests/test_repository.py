import pytest
from decimal import Decimal

from compra.repositories import BuyRepository
from compra.service import BuyService
from core.tests.factories import make_purchase, make_purchase_application, make_purchase_payment, make_supplier


@pytest.mark.django_db
class TestBuyRepositoryPayments:
    '''El total pagado de una compra es lo que sus pagos le aplicaron, no el importe de cada pago.'''

    def setup_method(self):
        self.repo = BuyRepository()
        self.supplier = make_supplier()

    def test_total_payments_suma_lo_aplicado_a_la_compra(self):
        buy = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(compra=buy, importe_abonado=Decimal('300.00'))
        make_purchase_payment(compra=buy, importe_abonado=Decimal('200.00'))

        assert self.repo.get_by_id(buy.id).total_payments == Decimal('500.00')

    def test_un_pago_de_varias_compras_cuenta_solo_su_parte_en_cada_una(self):
        first = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        second = make_purchase(importe=Decimal('2000.00'), proveedor=self.supplier)
        payment = make_purchase_payment(proveedor=self.supplier, compra=None, importe_abonado=Decimal('2500.00'))
        make_purchase_application(pago_compra=payment, compra=first, importe=Decimal('1000.00'))
        make_purchase_application(pago_compra=payment, compra=second, importe=Decimal('1000.00'))

        totals = {buy.id: buy.total_payments for buy in self.repo.get_all(proveedor_id=self.supplier.id)}

        assert totals == {first.id: Decimal('1000.00'), second.id: Decimal('1000.00')}
        assert BuyService.calculate_payment_status(self.repo.get_by_id(first.id)) == 'ABONADO'
        assert BuyService.calculate_payment_status(self.repo.get_by_id(second.id)) == 'PARCIAL'

    def test_pago_a_cuenta_no_cuenta_para_ninguna_compra(self):
        buy = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(proveedor=self.supplier, compra=None, importe_abonado=Decimal('800.00'))

        assert self.repo.get_by_id(buy.id).total_payments == Decimal('0')

    def test_sin_anotacion_calcula_lo_aplicado_con_una_consulta(self):
        buy = make_purchase(importe=Decimal('1000.00'), senia=Decimal('100.00'), proveedor=self.supplier)
        make_purchase_payment(compra=buy, importe_abonado=Decimal('400.00'))

        # La compra recién leída de la base, sin la anotación total_payments del repositorio.
        buy.refresh_from_db()
        assert BuyService.calculate_outstanding_balance(buy) == Decimal('500.00')

    def test_un_pago_anulado_deja_de_contar_para_la_compra(self):
        buy = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(compra=buy, importe_abonado=Decimal('300.00'))
        make_purchase_payment(compra=buy, importe_abonado=Decimal('1000.00'), estado_pago='ANULADO')

        buy = self.repo.get_by_id(buy.id)

        assert buy.total_payments == Decimal('300.00')
        assert BuyService.calculate_payment_status(buy) == 'PARCIAL'

    def test_sin_annotation_el_service_tampoco_cuenta_los_pagos_anulados(self):
        buy = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(compra=buy, importe_abonado=Decimal('1000.00'), estado_pago='ANULADO')

        assert BuyService.calculate_payment_status(buy) == 'PENDIENTE'
