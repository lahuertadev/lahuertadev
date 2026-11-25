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

    def test_filtro_por_pagar_trae_pendientes_y_parciales_y_abonadas_el_resto(self):
        pending = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        partial = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(compra=partial, importe_abonado=Decimal('400.00'))
        paid = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(compra=paid, importe_abonado=Decimal('1000.00'))
        paid_with_deposit = make_purchase(importe=Decimal('1000.00'), senia=Decimal('200.00'), proveedor=self.supplier)
        make_purchase_payment(compra=paid_with_deposit, importe_abonado=Decimal('800.00'))

        unpaid_ids = {buy.id for buy in self.repo.get_all(payment_status='por_pagar')}
        paid_ids = {buy.id for buy in self.repo.get_all(payment_status='abonadas')}

        assert unpaid_ids == {pending.id, partial.id}
        assert paid_ids == {paid.id, paid_with_deposit.id}
        assert self.repo.get_all().count() == 4

    def test_filtro_por_pagar_no_cuenta_los_pagos_anulados(self):
        buy = make_purchase(importe=Decimal('1000.00'), proveedor=self.supplier)
        make_purchase_payment(compra=buy, importe_abonado=Decimal('1000.00'), estado_pago='ANULADO')

        assert [b.id for b in self.repo.get_all(payment_status='por_pagar')] == [buy.id]

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


@pytest.mark.django_db
class TestBuyRepositorySupplierSearch:
    '''Filtro Proveedor del listado: puesto o nombre, como en Pagos de Compras.'''

    def setup_method(self):
        self.repo = BuyRepository()
        self.salvita = make_supplier(nombre='Salvita', puesto=30)
        self.migogus = make_supplier(nombre='Migogus', puesto=12)
        self.salvita_buy = make_purchase(proveedor=self.salvita)
        self.migogus_buy = make_purchase(proveedor=self.migogus)

    def _ids(self, **filters):
        return {buy.id for buy in self.repo.get_all(**filters)}

    def test_busca_por_parte_del_nombre_sin_importar_mayusculas(self):
        assert self._ids(supplier='salv') == {self.salvita_buy.id}

    def test_un_numero_busca_por_puesto_exacto(self):
        assert self._ids(supplier='12') == {self.migogus_buy.id}

    def test_sin_coincidencias_devuelve_vacio(self):
        assert self._ids(supplier='Frutas') == set()

    def test_se_combina_con_los_otros_filtros(self):
        assert self._ids(supplier='Salvita', proveedor_id=self.migogus.id) == set()


@pytest.mark.django_db
class TestBuyRepositoryAppliedPayments:

    def test_devuelve_los_pagos_vigentes_y_anulados_de_la_compra(self):
        repo = BuyRepository()
        supplier = make_supplier()
        buy = make_purchase(proveedor=supplier)
        other = make_purchase(proveedor=supplier)
        current = make_purchase_payment(compra=buy, importe_abonado=Decimal('100.00'))
        cancelled = make_purchase_payment(compra=buy, importe_abonado=Decimal('50.00'), estado_pago='ANULADO')
        make_purchase_payment(compra=other, importe_abonado=Decimal('30.00'))

        assert repo.get_applied_payments(buy) == [current, cancelled]

    def test_sin_pagos_devuelve_lista_vacia(self):
        assert BuyRepository().get_applied_payments(make_purchase()) == []
