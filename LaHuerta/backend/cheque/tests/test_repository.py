import pytest
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from core.tests.factories import (
    make_bank, make_check, make_check_state, make_client_check_use, make_client_payment, make_purchase_payment,
)
from cheque.models import Cheque
from cheque.repositories import CheckRepository


@pytest.mark.django_db
class TestCheckRepository:
    def setup_method(self):
        self.repository = CheckRepository()
        self.banco = make_bank(descripcion='Nación')
        self.estado = make_check_state(descripcion='EN_CARTERA')

    def _make_cheque(self, numero=1001, importe=Decimal('1000.00')):
        return make_check(numero=numero, importe=importe, banco=self.banco, estado=self.estado)

    def _make_cliente_con_pago(self):
        payment = make_client_payment()
        return payment.cliente, payment

    # ------------------------- GET ALL -------------------------
    def test_get_all_returns_all(self):
        self._make_cheque(1001)
        self._make_cheque(1002)

        result = self.repository.get_all()

        assert result.count() == 2

    def test_get_all_empty(self):
        result = self.repository.get_all()
        assert result.count() == 0

    def test_get_all_pending_tab_only_due_checks_in_wallet(self):
        today = timezone.localdate()
        due_today = make_check(numero=1, banco=self.banco, estado=self.estado, fecha_deposito=today)
        overdue = make_check(numero=2, banco=self.banco, estado=self.estado, fecha_deposito=today - timedelta(days=3))
        make_check(numero=3, banco=self.banco, estado=self.estado, fecha_deposito=today + timedelta(days=1))
        make_check(numero=4, banco=self.banco, estado=self.estado, fecha_deposito=None)
        deposited = make_check_state(descripcion='DEPOSITADO')
        make_check(numero=5, banco=self.banco, estado=deposited, fecha_deposito=today - timedelta(days=3))

        result = self.repository.get_all(tab='pendientes')

        assert set(result.values_list('id', flat=True)) == {due_today.id, overdue.id}

    def test_get_all_rejected_tab_only_rejected(self):
        rejected = make_check_state(descripcion='RECHAZADO')
        rejected_check = make_check(numero=1, banco=self.banco, estado=rejected)
        self._make_cheque(2)

        result = self.repository.get_all(tab='rechazados')

        assert list(result.values_list('id', flat=True)) == [rejected_check.id]

    def test_get_all_tab_combines_with_filters(self):
        rejected = make_check_state(descripcion='RECHAZADO')
        make_check(numero=1, banco=self.banco, estado=rejected)
        other_bank = make_bank(descripcion='Galicia')
        galicia_check = make_check(numero=2, banco=other_bank, estado=rejected)

        result = self.repository.get_all(tab='rechazados', bank='Galicia')

        assert list(result.values_list('id', flat=True)) == [galicia_check.id]

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_ok(self):
        cheque = self._make_cheque(1001)

        result = self.repository.get_by_id(cheque.id)

        assert result is not None
        assert result.numero == cheque.numero

    def test_get_by_id_not_found_returns_none(self):
        result = self.repository.get_by_id(9999)
        assert result is None

    # ------------------------- EXISTS DUPLICATE -----------------
    def test_exists_duplicate_mismo_numero_banco_cliente(self):
        cliente, payment = self._make_cliente_con_pago()
        cheque = self._make_cheque(numero=3001)
        cheque.pago_cliente = payment
        cheque.save()

        assert self.repository.exists_duplicate(3001, self.banco, cliente) is True

    def test_exists_duplicate_distinto_banco_no_es_duplicado(self):
        cliente, payment = self._make_cliente_con_pago()
        cheque = self._make_cheque(numero=3001)
        cheque.pago_cliente = payment
        cheque.save()
        otro_banco = make_bank(descripcion='Galicia')

        assert self.repository.exists_duplicate(3001, otro_banco, cliente) is False

    def test_exists_duplicate_excluye_el_propio_cheque(self):
        cliente, payment = self._make_cliente_con_pago()
        cheque = self._make_cheque(numero=3001)
        cheque.pago_cliente = payment
        cheque.save()

        assert self.repository.exists_duplicate(3001, self.banco, cliente, exclude_id=cheque.id) is False

    def test_exists_duplicate_ignora_los_cheques_anulados(self):
        # Un cheque de un pago anulado fue una carga equivocada: se puede volver a cargar.
        cliente, payment = self._make_cliente_con_pago()
        make_check(numero=3001, banco=self.banco, estado=make_check_state(descripcion='ANULADO'), pago_cliente=payment)

        assert self.repository.exists_duplicate(3001, self.banco, cliente) is False

    def test_exists_duplicate_cuenta_los_cheques_rechazados(self):
        cliente, payment = self._make_cliente_con_pago()
        make_check(numero=3001, banco=self.banco, estado=make_check_state(descripcion='RECHAZADO'), pago_cliente=payment)

        assert self.repository.exists_duplicate(3001, self.banco, cliente) is True

    # ------------------------- CREATE --------------------------
    def test_create_ok(self):
        data = {
            'numero': 2001,
            'importe': Decimal('500.00'),
            'fecha_emision': '2024-06-01',
            'banco': self.banco,
            'estado': self.estado,
        }

        result = self.repository.create(data)

        assert result.numero == 2001
        assert result.importe == Decimal('500.00')
        assert Cheque.objects.count() == 1

    def test_create_con_fecha_deposito(self):
        data = {
            'numero': 2002,
            'importe': Decimal('300.00'),
            'fecha_emision': '2024-06-01',
            'fecha_deposito': '2024-06-15',
            'banco': self.banco,
            'estado': self.estado,
        }

        result = self.repository.create(data)

        assert result.fecha_deposito is not None

    # ------------------------- UPDATE --------------------------
    def test_update_ok(self):
        cheque = self._make_cheque(1001)
        estado_nuevo = make_check_state(descripcion='DEPOSITADO')

        updated = self.repository.update(cheque, {'estado': estado_nuevo})

        cheque.refresh_from_db()
        assert cheque.estado.descripcion == 'DEPOSITADO'

    def test_update_importe(self):
        cheque = self._make_cheque(1001, importe=Decimal('1000.00'))

        self.repository.update(cheque, {'importe': Decimal('1500.00')})

        cheque.refresh_from_db()
        assert cheque.importe == Decimal('1500.00')

    # ------------------------- DELETE --------------------------
    def test_delete_ok(self):
        cheque = self._make_cheque(1001)

        self.repository.delete(cheque)

        assert Cheque.objects.count() == 0

    # ---------------- PAGOS A PROVEEDOR QUE LO REGISTRAN ----------------
    def test_get_purchase_payment_ids_devuelve_los_pagos_que_registran_el_cheque(self):
        check = self._make_cheque(1001)
        first = make_purchase_payment(estado_pago='ANULADO')
        second = make_purchase_payment()
        make_client_check_use(cheque=check, pago_compra=second)
        make_client_check_use(cheque=check, pago_compra=first)

        assert self.repository.get_purchase_payment_ids(check) == sorted([first.id, second.id])

    def test_get_purchase_payment_ids_sin_pagos_devuelve_lista_vacia(self):
        check = self._make_cheque(1001)

        assert self.repository.get_purchase_payment_ids(check) == []
