import pytest
from decimal import Decimal
from unittest.mock import Mock

from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from cheque.interfaces import ICheckRepository
from pago_compra.interfaces import IPurchasePaymentRepository
from pago_compra.service import PurchasePaymentService
from pago_compra.service import OwnCheckInsufficientBalanceException
from pago_compra.exceptions import (
    PaymentEditBlockedException,
    PurchasePaymentNotFoundException,
    PaymentExceedsBalanceException,
    PaymentSupplierMismatchException,
    OwnCheckOtherSupplierException,
)
from proveedor.interfaces import ISupplierRepository
from cheque.exceptions import CheckNotFoundException
from core.tests.factories import make_check_state, make_payment_type
from core.tests.mocks import (
    mock_check, mock_check_state, mock_own_check, mock_purchase, mock_purchase_payment, mock_supplier,
)
from cheque_propio.exceptions import OwnCheckNotFoundException


# ── Fake repos ─────────────────────────────────────────────────────────────────

class FakePurchasePaymentRepo(IPurchasePaymentRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1
        self.own_checks_used = {}

    def get_all(self, compra_id=None, supplier_id=None, **filters):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago, compra=None):
        payment = mock_purchase_payment(
            id=self._next_id, proveedor=proveedor, compra=compra,
            importe_abonado=importe_abonado, tipo_pago=tipo_pago, fecha_pago=fecha_pago,
        )
        self._next_id += 1
        used = self.own_checks_used.setdefault(payment.id, [])
        payment.own_check_uses.exists = lambda: bool(used)
        _attach_checks(payment, [])
        self._items[payment.id] = payment
        return payment

    def add_own_check_use(self, payment, own_check, amount):
        self.own_checks_used[payment.id].append((own_check, amount))

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        return payment

    def delete(self, payment):
        self._items.pop(payment.id, None)


class FakeCheckRepo(ICheckRepository):
    def __init__(self):
        self._items = {}
        self._updated = []

    def get_all(self, bank=None, state=None, endorsed=None, deposit_date_from=None, deposit_date_to=None):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(id)

    def exists_duplicate(self, number, bank, client, exclude_id=None):
        return False

    def create(self, data):
        pass

    def update(self, check, data):
        for k, v in data.items():
            setattr(check, k, v)
        self._updated.append(data)
        return check

    def delete(self, check):
        self._items.pop(check.id, None)


class FakeOwnCheckRepo:
    def __init__(self):
        self._items = {}

    def get_by_id(self, id):
        return self._items.get(int(id))


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

def _attach_checks(payment, checks):
    '''Cheques de clientes endosados al pago (payment.cheque_set).'''
    payment.cheque_set.all = Mock(return_value=checks)
    payment.cheque_set.exists = Mock(return_value=bool(checks))


def _make_check(id, importe, estado):
    return mock_check(id=id, numero=id, importe=importe, endosado=False, estado=estado)


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
        own_check_repository=FakeOwnCheckRepo(),
    )


def _make_compra(importe=Decimal('10000.00'), senia=Decimal('0.00'), total_payments=Decimal('0.00'), supplier=None):
    return mock_purchase(
        id=1, importe=importe, senia=senia, total_payments=total_payments,
        proveedor=supplier or mock_supplier(cuenta_corriente=Decimal('10000.00')),
    )


def _make_own_check(numero=900, importe=Decimal('1000000.00'), used=Decimal('0'), used_by_other_supplier=False):
    own_check = mock_own_check(id=numero, numero=numero, importe=importe)
    own_check.payment_uses.aggregate.return_value = {'total': used}
    own_check.pagocompra_set.exclude.return_value.exists.return_value = used_by_other_supplier
    return own_check


def _purchase_payment_data(compra, **extra):
    return {'proveedor': compra.proveedor, 'compra': compra, **extra}


# ── Tests: create_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreatePurchasePayment:

    def setup_method(self):
        self.tipo_efectivo = make_payment_type(descripcion='Efectivo')
        self.tipo_cheque = make_payment_type(descripcion='Cheque')
        make_check_state(descripcion=check_status.EN_CARTERA)
        make_check_state(descripcion=check_status.ENDOSADO)

    def test_tipo_efectivo_no_endosa_cheque(self):
        service = _make_service()

        service.create_payment({
            **_purchase_payment_data(_make_compra()),
            'importe_abonado': Decimal('1000.00'),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert len(service.check_repository._updated) == 0

    def test_tipo_cheque_endosa_el_cheque(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        check = _make_check(100, Decimal('5000.00'), en_cartera)
        service.check_repository._items[100] = check

        payment = service.create_payment({
            **_purchase_payment_data(_make_compra()),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'cheque_ids': [100],
        })

        assert check.endosado is True
        assert check.estado.descripcion == 'ENDOSADO'
        assert check.pago_compra == payment

    def test_varios_cheques_se_endosan_y_el_importe_es_la_suma(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        first = _make_check(100, Decimal('500000.00'), en_cartera)
        second = _make_check(101, Decimal('500000.00'), en_cartera)
        service.check_repository._items.update({100: first, 101: second})
        supplier = mock_supplier(cuenta_corriente=Decimal('1000000.00'))
        compra = _make_compra(importe=Decimal('1000000.00'), supplier=supplier)

        payment = service.create_payment({
            **_purchase_payment_data(compra),
            # Si llegara un importe, se ignora: el pago vale lo que suman los cheques.
            'importe_abonado': Decimal('1.00'),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'cheque_ids': [100, 101],
        })

        assert payment.importe_abonado == Decimal('1000000.00')
        assert first.pago_compra == payment and second.pago_compra == payment
        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_cheques_que_superan_el_saldo_de_la_compra_lanzan_excepcion(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        service.check_repository._items.update({
            100: _make_check(100, Decimal('600.00'), en_cartera),
            101: _make_check(101, Decimal('600.00'), en_cartera),
        })

        with pytest.raises(PaymentExceedsBalanceException):
            service.create_payment({
                **_purchase_payment_data(_make_compra(importe=Decimal('1000.00'))),
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'cheque_ids': [100, 101],
            })
        assert service.check_repository._updated == []

    def test_tipo_cheque_no_encontrado_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(CheckNotFoundException):
            service.create_payment({
                **_purchase_payment_data(_make_compra()),
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'cheque_ids': [99999],
            })

    def test_importe_supera_saldo_lanza_excepcion(self):
        service = _make_service()
        # compra de $1000, sin pagos → saldo = $1000; se intenta pagar $1001
        compra = _make_compra(importe=Decimal('1000.00'), total_payments=Decimal('0.00'))

        with pytest.raises(PaymentExceedsBalanceException):
            service.create_payment({
                **_purchase_payment_data(compra),
                'importe_abonado': Decimal('1001.00'),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })

    def test_create_decrementa_cc_proveedor(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('10000.00'))
        compra = _make_compra(importe=Decimal('10000.00'), supplier=supplier)

        service.create_payment({
            **_purchase_payment_data(compra),
            'importe_abonado': Decimal('3000.00'),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert supplier.cuenta_corriente == Decimal('7000.00')
        assert len(service.supplier_repository.updated) == 1

    def test_create_compra_de_otro_proveedor_lanza_excepcion(self):
        service = _make_service()
        compra = _make_compra(supplier=mock_supplier(id=1))

        with pytest.raises(PaymentSupplierMismatchException):
            service.create_payment({
                'proveedor': mock_supplier(id=2),
                'compra': compra,
                'importe_abonado': Decimal('100.00'),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })

        assert service.payment_repository.get_all() == []


# ── Tests: create_payment a cuenta (sin compra) ────────────────────────────────

@pytest.mark.django_db
class TestCreateOnAccountPayment:

    def setup_method(self):
        self.tipo_efectivo = make_payment_type(descripcion='Efectivo')
        self.tipo_cheque_propio = make_payment_type(descripcion='Cheque Propio')

    def _on_account_data(self, supplier, amount, **extra):
        return {
            'proveedor': supplier,
            'importe_abonado': amount,
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
            **extra,
        }

    def test_pago_a_cuenta_descuenta_cc_sin_compra(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('8577000.00'))

        payment = service.create_payment(self._on_account_data(supplier, Decimal('1000000.00')))

        assert payment.compra is None
        assert payment.proveedor is supplier
        assert supplier.cuenta_corriente == Decimal('7577000.00')
        assert len(service.supplier_repository.updated) == 1

    def test_pago_a_cuenta_puede_superar_el_saldo_de_compras(self):
        # Sin compra no hay saldo pendiente que validar: el pago es sobre el saldo de la cuenta.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('500.00'))

        service.create_payment(self._on_account_data(supplier, Decimal('800.00')))

        assert supplier.cuenta_corriente == Decimal('-300.00')

    def test_pago_a_cuenta_con_cheque_emitido(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('10000.00'))
        own_check = _make_own_check(importe=Decimal('1000000.00'), used=Decimal('300000.00'))
        service.own_check_repository._items[own_check.id] = own_check

        payment = service.create_payment(self._on_account_data(
            supplier, None, tipo_pago=self.tipo_cheque_propio,
            own_checks=[{'id': own_check.id, 'importe': Decimal('700000.00')}],
        ))

        assert service.payment_repository.own_checks_used[payment.id] == [(own_check, Decimal('700000.00'))]
        assert payment.importe_abonado == Decimal('700000.00')
        own_check.pagocompra_set.exclude.assert_called_once_with(proveedor_id=supplier.id)

    def test_varios_cheques_emitidos_suman_el_importe_del_pago(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('2000000.00'))
        first = _make_own_check(numero=884, importe=Decimal('1000000.00'), used=Decimal('300000.00'))
        second = _make_own_check(numero=885, importe=Decimal('500000.00'))
        service.own_check_repository._items.update({first.id: first, second.id: second})

        payment = service.create_payment(self._on_account_data(
            supplier, None, tipo_pago=self.tipo_cheque_propio,
            own_checks=[{'id': 884, 'importe': Decimal('700000.00')}, {'id': 885, 'importe': Decimal('500000.00')}],
        ))

        assert payment.importe_abonado == Decimal('1200000.00')
        assert service.payment_repository.own_checks_used[payment.id] == [(first, Decimal('700000.00')), (second, Decimal('500000.00'))]
        assert supplier.cuenta_corriente == Decimal('800000.00')

    def test_cheque_emitido_usado_con_otro_proveedor_lanza_excepcion(self):
        service = _make_service()
        own_check = _make_own_check(used=Decimal('100.00'), used_by_other_supplier=True)
        service.own_check_repository._items[own_check.id] = own_check
        supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))

        with pytest.raises(OwnCheckOtherSupplierException):
            service.create_payment(self._on_account_data(
                supplier, None, tipo_pago=self.tipo_cheque_propio, own_checks=[{'id': own_check.id, 'importe': Decimal('100.00')}],
            ))

        assert supplier.cuenta_corriente == Decimal('1000.00')

    def test_cheque_emitido_sin_saldo_suficiente_lanza_excepcion(self):
        service = _make_service()
        own_check = _make_own_check(importe=Decimal('1000.00'), used=Decimal('900.00'))
        service.own_check_repository._items[own_check.id] = own_check

        with pytest.raises(OwnCheckInsufficientBalanceException):
            service.create_payment(self._on_account_data(
                mock_supplier(cuenta_corriente=Decimal('10000.00')), None, tipo_pago=self.tipo_cheque_propio, own_checks=[{'id': own_check.id, 'importe': Decimal('200.00')}],
            ))

    def test_cheque_emitido_no_encontrado_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(OwnCheckNotFoundException):
            service.create_payment(self._on_account_data(
                mock_supplier(cuenta_corriente=Decimal('10000.00')), None, tipo_pago=self.tipo_cheque_propio, own_checks=[{'id': 404, 'importe': Decimal('200.00')}],
            ))


# ── Tests: delete_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeletePurchasePayment:

    def setup_method(self):
        self.tipo_efectivo = make_payment_type(descripcion='Efectivo')
        self.tipo_cheque = make_payment_type(descripcion='Cheque')
        make_check_state(descripcion=check_status.EN_CARTERA)

    def test_delete_pago_sin_cheque(self):
        service = _make_service()
        compra = _make_compra()
        payment = service.payment_repository.create(
            proveedor=compra.proveedor,
            compra=compra,
            importe_abonado=Decimal('1000.00'),
            tipo_pago=self.tipo_efectivo,
            fecha_pago='2024-01-01',
        )
        payment_id = payment.id

        service.delete_payment(payment_id)

        assert service.payment_repository.get_by_id(payment_id) is None

    def test_delete_pago_con_cheque_revierte_estado(self):
        service = _make_service()
        compra = _make_compra()
        payment = service.payment_repository.create(
            proveedor=compra.proveedor,
            compra=compra,
            importe_abonado=Decimal('2000.00'),
            tipo_pago=self.tipo_cheque,
            fecha_pago='2024-01-01',
        )
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        check = _make_check(55555, Decimal('2000.00'), Mock())
        check.endosado = True
        _attach_checks(payment, [check])

        service.delete_payment(payment.id)

        assert check.endosado is False
        assert check.estado == en_cartera
        assert check.pago_compra is None

    def test_delete_no_devuelve_dos_veces_lo_de_un_cheque_rechazado(self):
        # El rechazo ya devolvió su importe a la cuenta corriente: al eliminar el pago solo
        # vuelve lo de los demás cheques, y el rechazado no vuelve a cartera.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('3000.00'))
        compra = _make_compra(supplier=supplier)
        payment = service.payment_repository.create(
            proveedor=compra.proveedor, compra=compra, importe_abonado=Decimal('5000.00'),
            tipo_pago=self.tipo_cheque, fecha_pago='2024-01-01',
        )
        rejected_state = mock_check_state(descripcion=check_status.RECHAZADO)
        rejected = _make_check(1, Decimal('2000.00'), rejected_state)
        endorsed = _make_check(2, Decimal('3000.00'), Mock())
        _attach_checks(payment, [rejected, endorsed])

        service.delete_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('6000.00')
        assert rejected.estado is rejected_state
        assert endorsed.pago_compra is None

    def test_delete_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(PurchasePaymentNotFoundException):
            service.delete_payment(9999)

    def test_delete_incrementa_cc_proveedor(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(importe=Decimal('10000.00'), supplier=supplier)
        payment = service.payment_repository.create(
            proveedor=compra.proveedor,
            compra=compra,
            importe_abonado=Decimal('3000.00'),
            tipo_pago=self.tipo_efectivo,
            fecha_pago='2024-01-01',
        )

        service.delete_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('10000.00')
        assert len(service.supplier_repository.updated) == 1

    def test_delete_pago_a_cuenta_devuelve_importe_al_proveedor(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7577000.00'))
        payment = service.payment_repository.create(
            proveedor=supplier,
            importe_abonado=Decimal('1000000.00'),
            tipo_pago=self.tipo_efectivo,
            fecha_pago='2024-01-01',
        )

        service.delete_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('8577000.00')
        assert service.payment_repository.get_by_id(payment.id) is None


# ── Tests: update_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUpdatePurchasePayment:

    def setup_method(self):
        self.tipo_efectivo = make_payment_type(descripcion='Efectivo')
        self.tipo_cheque_propio = make_payment_type(descripcion='Cheque Propio')

    def _create(self, service, amount, compra=None, supplier=None, tipo=None):
        return service.payment_repository.create(
            proveedor=supplier or compra.proveedor,
            compra=compra,
            importe_abonado=amount,
            tipo_pago=tipo or self.tipo_efectivo,
            fecha_pago='2026-10-01',
        )

    def test_cambia_fecha_sin_tocar_cuenta_corriente(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        updated = service.update_payment(payment.id, {'importe_abonado': Decimal('3000.00'), 'fecha_pago': '2026-10-05'})

        assert updated.fecha_pago == '2026-10-05'
        assert supplier.cuenta_corriente == Decimal('7000.00')
        assert service.supplier_repository.updated == []

    def test_subir_importe_descuenta_la_diferencia_de_la_cuenta_corriente(self):
        service = _make_service()
        # compra de $10000 con $3000 pagados (este pago): saldo pendiente $7000
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        updated = service.update_payment(payment.id, {'importe_abonado': Decimal('5000.00'), 'fecha_pago': '2026-10-01'})

        assert updated.importe_abonado == Decimal('5000.00')
        assert supplier.cuenta_corriente == Decimal('5000.00')

    def test_bajar_importe_devuelve_la_diferencia_a_la_cuenta_corriente(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        service.update_payment(payment.id, {'importe_abonado': Decimal('1000.00'), 'fecha_pago': '2026-10-01'})

        assert supplier.cuenta_corriente == Decimal('9000.00')

    def test_importe_puede_llegar_al_total_de_la_compra(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        service.update_payment(payment.id, {'importe_abonado': Decimal('10000.00'), 'fecha_pago': '2026-10-01'})

        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_importe_mayor_al_saldo_de_la_compra_lanza_excepcion(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        with pytest.raises(PaymentExceedsBalanceException):
            service.update_payment(payment.id, {'importe_abonado': Decimal('10000.01'), 'fecha_pago': '2026-10-01'})
        assert supplier.cuenta_corriente == Decimal('7000.00')

    def test_pago_a_cuenta_no_tiene_tope(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))
        payment = self._create(service, Decimal('1000.00'), supplier=supplier)

        service.update_payment(payment.id, {'importe_abonado': Decimal('5000.00'), 'fecha_pago': '2026-10-01'})

        assert supplier.cuenta_corriente == Decimal('-3000.00')

    def test_pago_con_cheques_emitidos_solo_cambia_la_fecha(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('400.00'), supplier=supplier, tipo=self.tipo_cheque_propio)
        service.payment_repository.add_own_check_use(payment, _make_own_check(), Decimal('400.00'))

        with pytest.raises(PaymentEditBlockedException):
            service.update_payment(payment.id, {'importe_abonado': Decimal('800.00'), 'fecha_pago': '2026-10-01'})
        service.update_payment(payment.id, {'importe_abonado': Decimal('400.00'), 'fecha_pago': '2026-10-09'})

        assert payment.fecha_pago == '2026-10-09'
        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_pago_con_cheques_de_clientes_solo_cambia_la_fecha(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('10000.00'))
        payment = self._create(service, Decimal('2000.00'), supplier=supplier)
        _attach_checks(payment, [_make_check(1, Decimal('2000.00'), Mock())])

        with pytest.raises(PaymentEditBlockedException):
            service.update_payment(payment.id, {'importe_abonado': Decimal('1500.00'), 'fecha_pago': '2026-10-01'})
        service.update_payment(payment.id, {'importe_abonado': Decimal('2000.00'), 'fecha_pago': '2026-10-09'})
        assert payment.fecha_pago == '2026-10-09'

    def test_update_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(PurchasePaymentNotFoundException):
            service.update_payment(9999, {'importe_abonado': Decimal('1.00'), 'fecha_pago': '2026-10-01'})
