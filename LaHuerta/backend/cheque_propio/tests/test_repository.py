import pytest
from decimal import Decimal

from cheque_propio.models import OwnCheck
from cheque_propio.repositories import OwnCheckRepository
from core.tests.factories import make_bank, make_own_check, make_purchase, make_purchase_payment, make_supplier
from pago_compra.models import PagoCompra


@pytest.mark.django_db
class TestOwnCheckRepository:
    def setup_method(self):
        self.repository = OwnCheckRepository()
        self.banco = make_bank(descripcion='Nación')

    def _make_own_check(self, numero=1001, importe=Decimal('1000.00'), banco=None, estado=OwnCheck.State.EMITIDO):
        return make_own_check(
            numero=numero,
            importe=importe,
            fecha_emision='2024-01-01',
            fecha_vencimiento='2024-06-01',
            banco=banco or self.banco,
            estado=estado,
        )

    def _make_proveedor(self, nombre='ProvTest'):
        return make_supplier(nombre=nombre)

    def _make_pago_compra(self, own_check, proveedor, importe_abonado=Decimal('500.00'), with_buy=True):
        return make_purchase_payment(
            proveedor=proveedor,
            compra=make_purchase(proveedor=proveedor) if with_buy else None,
            importe_abonado=importe_abonado,
            cheque_propio=own_check,
        )

    # ------------------------- GET ALL -------------------------
    def test_get_all_returns_all(self):
        self._make_own_check(1001)
        self._make_own_check(1002)

        result = self.repository.get_all()

        assert result.count() == 2

    def test_get_all_empty(self):
        result = self.repository.get_all()
        assert result.count() == 0

    def test_get_all_filtra_por_estado(self):
        self._make_own_check(1001, estado=OwnCheck.State.EMITIDO)
        self._make_own_check(1002, estado=OwnCheck.State.ANULADO)

        result = self.repository.get_all(state=OwnCheck.State.ANULADO)

        assert result.count() == 1
        assert result.first().numero == 1002

    def test_get_all_filtra_por_banco(self):
        otro_banco = make_bank(descripcion='Galicia')
        self._make_own_check(1001, banco=self.banco)
        self._make_own_check(1002, banco=otro_banco)

        result = self.repository.get_all(bank='gali')

        assert result.count() == 1
        assert result.first().numero == 1002

    def test_get_all_available_excluye_el_cheque_usado_en_un_pago(self):
        own_check = self._make_own_check(1001, importe=Decimal('1000.00'))
        proveedor = self._make_proveedor()
        self._make_pago_compra(own_check, proveedor, importe_abonado=Decimal('1000.00'))
        self._make_own_check(1002, importe=Decimal('1000.00'))  # sin uso, disponible completo

        result = self.repository.get_all(available=True)

        assert result.count() == 1
        assert result.first().numero == 1002

    def test_get_all_available_excluye_no_emitidos(self):
        self._make_own_check(1001, estado=OwnCheck.State.ANULADO)

        result = self.repository.get_all(available=True)

        assert result.count() == 0

    def test_get_all_available_un_pago_anulado_libera_el_cheque(self):
        # Al anular el pago, el cheque deja de estar vinculado (el historial queda).
        own_check = self._make_own_check(1001, importe=Decimal('1000.00'))
        payment = self._make_pago_compra(own_check, self._make_proveedor('Proveedor A'), importe_abonado=Decimal('1000.00'))
        PagoCompra.objects.filter(id=payment.id).update(estado_pago='ANULADO')
        OwnCheck.objects.filter(id=own_check.id).update(pago_compra=None)

        assert [c.numero for c in self.repository.get_all(available=True)] == [1001]

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_ok(self):
        own_check = self._make_own_check(1001)

        result = self.repository.get_by_id(own_check.id)

        assert result is not None
        assert result.numero == own_check.numero

    def test_get_by_id_not_found_returns_none(self):
        result = self.repository.get_by_id(9999)
        assert result is None

    # ------------------------- EXISTS DUPLICATE -----------------
    def test_exists_duplicate_mismo_numero_banco(self):
        self._make_own_check(numero=3001, banco=self.banco)

        assert self.repository.exists_duplicate(3001, self.banco) is True

    def test_exists_duplicate_distinto_banco_no_es_duplicado(self):
        self._make_own_check(numero=3001, banco=self.banco)
        otro_banco = make_bank(descripcion='Galicia')

        assert self.repository.exists_duplicate(3001, otro_banco) is False

    def test_exists_duplicate_excluye_el_propio_cheque(self):
        own_check = self._make_own_check(numero=3001, banco=self.banco)

        assert self.repository.exists_duplicate(3001, self.banco, exclude_id=own_check.id) is False

    # ------------------------- CREATE --------------------------
    def test_create_ok(self):
        data = {
            'numero': 2001,
            'importe': Decimal('500.00'),
            'fecha_emision': '2024-06-01',
            'fecha_vencimiento': '2024-12-01',
            'banco': self.banco,
        }

        result = self.repository.create(data)

        assert result.numero == 2001
        assert result.importe == Decimal('500.00')
        assert result.estado == OwnCheck.State.EMITIDO
        assert OwnCheck.objects.count() == 1

    # ------------------------- UPDATE --------------------------
    def test_update_ok(self):
        own_check = self._make_own_check(1001)

        self.repository.update(own_check, {'estado': OwnCheck.State.ANULADO})

        own_check.refresh_from_db()
        assert own_check.estado == OwnCheck.State.ANULADO

    def test_update_importe(self):
        own_check = self._make_own_check(1001, importe=Decimal('1000.00'))

        self.repository.update(own_check, {'importe': Decimal('1500.00')})

        own_check.refresh_from_db()
        assert own_check.importe == Decimal('1500.00')

    # ------------------------- DELETE --------------------------
    def test_delete_ok(self):
        own_check = self._make_own_check(1001)

        self.repository.delete(own_check)

        assert OwnCheck.objects.count() == 0
