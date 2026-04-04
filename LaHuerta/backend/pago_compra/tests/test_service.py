import pytest
from decimal import Decimal
from unittest.mock import Mock

from estado_cheque.models import EstadoCheque
from tipo_pago.models import TipoPago
from cheque.interfaces import ICheckRepository
from pago_compra.interfaces import IPurchasePaymentRepository
from pago_compra.service import PurchasePaymentService
from pago_compra.exceptions import PurchasePaymentNotFoundException, PaymentExceedsBalanceException
from proveedor.interfaces import ISupplierRepository
from cheque.exceptions import CheckNotFoundException


# ── Fake repos ─────────────────────────────────────────────────────────────────

class FakePurchasePaymentRepo(IPurchasePaymentRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1

    def get_all(self, compra_id=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, compra, importe_abonado, tipo_pago, fecha_pago):
        payment = Mock()
        payment.id = self._next_id
        self._next_id += 1
        payment.compra = compra
        payment.importe_abonado = importe_abonado
        payment.tipo_pago = tipo_pago
        payment.fecha_pago = fecha_pago
        payment.cheque_set = Mock()
        payment.cheque_set.first = Mock(return_value=None)
        self._items[payment.id] = payment
        return payment

    def delete(self, payment):
        self._items.pop(payment.id, None)


class FakeCheckRepo(ICheckRepository):
    def __init__(self):
        self._items = {}
        self._updated = []

    def get_all(self, banco=None, estado=None, endosado=None, fecha_deposito_desde=None, fecha_deposito_hasta=None):
        return list(self._items.values())

    def get_by_id(self, numero):
        return self._items.get(numero)

    def create(self, data):
        pass

    def update(self, check, data):
        for k, v in data.items():
            setattr(check, k, v)
        self._updated.append(data)
        return check

    def delete(self, check):
        self._items.pop(check.numero, None)


class FakeSupplierRepo(ISupplierRepository):
    def __init__(self):
        self.updated = []

    def get_all_suppliers(self, searchQuery=None, mercado=None):
        pass

    def get_supplier_by_id(self, id):
        pass

    def create_supplier(self, data):
        pass

    def modify_supplier(self, supplier, data):
        pass

    def delete_supplier(self, supplier):
        pass

    def update_balance(self, supplier):
        self.updated.append(supplier.cuenta_corriente)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_service():
    from cheque.service import CheckService
    payment_repo = FakePurchasePaymentRepo()
    check_repo = FakeCheckRepo()
    check_service = CheckService(check_repository=check_repo)
    supplier_repo = FakeSupplierRepo()
    return PurchasePaymentService(
        payment_repository=payment_repo,
        check_repository=check_repo,
        check_service=check_service,
        supplier_repository=supplier_repo,
    )


def _make_compra(importe=Decimal('10000.00'), senia=Decimal('0.00'), total_payments=Decimal('0.00'), cc=Decimal('10000.00')):
    supplier = Mock()
    supplier.cuenta_corriente = cc

    compra = Mock()
    compra.id = 1
    compra.importe = importe
    compra.senia = senia
    compra.total_payments = total_payments
    compra.proveedor = supplier
    return compra


# ── Tests: create_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreatePurchasePayment:

    def setup_method(self):
        self.tipo_efectivo = TipoPago.objects.create(descripcion='Efectivo')
        self.tipo_cheque = TipoPago.objects.create(descripcion='Cheque')
        EstadoCheque.objects.create(descripcion='EN_CARTERA')
        EstadoCheque.objects.create(descripcion='ENDOSADO')

    def test_tipo_efectivo_no_endosa_cheque(self):
        service = _make_service()

        service.create_payment({
            'compra': _make_compra(),
            'importe_abonado': Decimal('1000.00'),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert len(service.check_repository._updated) == 0

    def test_tipo_cheque_endosa_el_cheque(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion='EN_CARTERA')
        check = Mock()
        check.numero = 12345
        check.endosado = False
        check.estado = en_cartera
        service.check_repository._items[12345] = check

        payment = service.create_payment({
            'compra': _make_compra(),
            'importe_abonado': Decimal('5000.00'),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'cheque_numero': 12345,
        })

        assert check.endosado is True
        assert check.estado.descripcion == 'ENDOSADO'
        assert check.pago_compra == payment

    def test_tipo_cheque_no_encontrado_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(CheckNotFoundException):
            service.create_payment({
                'compra': _make_compra(),
                'importe_abonado': Decimal('1000.00'),
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'cheque_numero': 99999,
            })

    def test_importe_supera_saldo_lanza_excepcion(self):
        service = _make_service()
        # compra de $1000, sin pagos → saldo = $1000; se intenta pagar $1001
        compra = _make_compra(importe=Decimal('1000.00'), total_payments=Decimal('0.00'))

        with pytest.raises(PaymentExceedsBalanceException):
            service.create_payment({
                'compra': compra,
                'importe_abonado': Decimal('1001.00'),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })

    def test_create_decrementa_cc_proveedor(self):
        service = _make_service()
        compra = _make_compra(importe=Decimal('10000.00'), cc=Decimal('10000.00'))

        service.create_payment({
            'compra': compra,
            'importe_abonado': Decimal('3000.00'),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert compra.proveedor.cuenta_corriente == Decimal('7000.00')
        assert len(service.supplier_repository.updated) == 1


# ── Tests: delete_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeletePurchasePayment:

    def setup_method(self):
        self.tipo_efectivo = TipoPago.objects.create(descripcion='Efectivo')
        self.tipo_cheque = TipoPago.objects.create(descripcion='Cheque')
        EstadoCheque.objects.create(descripcion='EN_CARTERA')

    def test_delete_pago_sin_cheque(self):
        service = _make_service()
        payment = service.payment_repository.create(
            compra=_make_compra(),
            importe_abonado=Decimal('1000.00'),
            tipo_pago=self.tipo_efectivo,
            fecha_pago='2024-01-01',
        )
        payment_id = payment.id

        service.delete_payment(payment_id)

        assert service.payment_repository.get_by_id(payment_id) is None

    def test_delete_pago_con_cheque_revierte_estado(self):
        service = _make_service()
        payment = service.payment_repository.create(
            compra=_make_compra(),
            importe_abonado=Decimal('2000.00'),
            tipo_pago=self.tipo_cheque,
            fecha_pago='2024-01-01',
        )
        en_cartera = EstadoCheque.objects.get(descripcion='EN_CARTERA')
        check = Mock()
        check.numero = 55555
        check.endosado = True
        check.estado = Mock()
        payment.cheque_set.first = Mock(return_value=check)

        service.delete_payment(payment.id)

        assert check.endosado is False
        assert check.estado == en_cartera
        assert check.pago_compra is None

    def test_delete_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(PurchasePaymentNotFoundException):
            service.delete_payment(9999)

    def test_delete_incrementa_cc_proveedor(self):
        service = _make_service()
        compra = _make_compra(importe=Decimal('10000.00'), cc=Decimal('7000.00'))
        payment = service.payment_repository.create(
            compra=compra,
            importe_abonado=Decimal('3000.00'),
            tipo_pago=self.tipo_efectivo,
            fecha_pago='2024-01-01',
        )

        service.delete_payment(payment.id)

        assert compra.proveedor.cuenta_corriente == Decimal('10000.00')
        assert len(service.supplier_repository.updated) == 1
