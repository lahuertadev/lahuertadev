import pytest
from decimal import Decimal

from core.tests.factories import make_bank, make_check, make_check_state, make_client_payment
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
