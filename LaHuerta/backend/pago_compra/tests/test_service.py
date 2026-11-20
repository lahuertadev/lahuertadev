import datetime
import pytest
from decimal import Decimal
from unittest.mock import Mock

from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from cheque.interfaces import ICheckRepository
from pago_compra.interfaces import IPurchasePaymentRepository
from pago_compra.service import PurchasePaymentService, reduce_payment_amount
from pago_compra.exceptions import (
    PaymentApplicationsExceedAmountException,
    PaymentCancelBlockedException,
    PaymentEditBlockedException,
    PurchasePaymentNotFoundException,
    PaymentExceedsBalanceException,
    PaymentSupplierMismatchException,
    OwnCheckNotAvailableException,
)
from proveedor.interfaces import ISupplierRepository
from cheque.exceptions import CheckNotFoundException
from core.tests.factories import make_check_state, make_payment_type
from core.tests.mocks import (
    mock_check, mock_check_state, mock_own_check, mock_purchase, mock_purchase_application,
    mock_own_check_use, mock_purchase_payment, mock_supplier,
)
from cheque_propio.exceptions import OwnCheckNotFoundException


# ── Fake repos ─────────────────────────────────────────────────────────────────

class FakePurchasePaymentRepo(IPurchasePaymentRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1
        self.own_checks_used = {}
        self.applications = {}
        self.client_checks_recorded = {}

    def get_all(self, compra_id=None, supplier_id=None, **filters):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago):
        payment = mock_purchase_payment(
            id=self._next_id, proveedor=proveedor, compra=None,
            importe_abonado=importe_abonado, tipo_pago=tipo_pago, fecha_pago=fecha_pago,
        )
        self._next_id += 1
        used = self.own_checks_used.setdefault(payment.id, [])
        payment.own_check_uses.exists = lambda: bool(used)
        payment.own_check_uses.all = lambda: [
            mock_own_check_use(pago_compra=payment, cheque_propio=own_check, importe=amount) for own_check, amount in used
        ]
        # Cheques emitidos del pago (cheque_propio.pago_compra): en el fake, los registrados en él.
        payment.owncheck_set.exists = lambda: bool(used)
        payment.owncheck_set.all = lambda: [own_check for own_check, _ in used]
        applications = self.applications.setdefault(payment.id, [])
        payment.purchase_applications.all = lambda: list(applications)
        _attach_checks(payment, [])
        self._items[payment.id] = payment
        return payment

    def add_own_check_use(self, payment, own_check, amount):
        self.own_checks_used[payment.id].append((own_check, amount))

    def add_client_check_use(self, payment, check):
        self.client_checks_recorded.setdefault(payment.id, []).append(check)

    def replace_purchase_applications(self, payment, applications):
        stored = self.applications[payment.id]
        stored.clear()
        stored.extend(
            mock_purchase_application(pago_compra=payment, compra=buy, importe=amount)
            for buy, amount in applications
        )

    def get_purchase_applications_newest_first(self, payment):
        return sorted(
            self.applications[payment.id],
            key=lambda application: (application.compra.fecha, application.compra.id),
            reverse=True,
        )

    def update_purchase_application(self, application, amount):
        application.importe = amount
        return application

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        return payment


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

    def get_purchase_payment_ids(self, check):
        return getattr(self, '_recorded', {}).get(check.id, [])


class FakeOwnCheckRepo:
    def __init__(self):
        self._items = {}

    def get_by_id(self, id):
        return self._items.get(int(id))

    def update(self, own_check, data):
        for field, value in data.items():
            setattr(own_check, field, value)
        if 'pago_compra' in data:
            own_check.pago_compra_id = data['pago_compra'].id if data['pago_compra'] else None
        return own_check


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


def _make_compra(importe=Decimal('10000.00'), senia=Decimal('0.00'), total_payments=Decimal('0.00'), supplier=None,
                 id=1, fecha=datetime.date(2026, 1, 15)):
    return mock_purchase(
        id=id, fecha=fecha, importe=importe, senia=senia, total_payments=total_payments,
        proveedor=supplier or mock_supplier(cuenta_corriente=Decimal('10000.00')),
    )


def _make_own_check(numero=900, importe=Decimal('1000000.00'), current_payment=None, estado=None):
    '''Cheque emitido; current_payment: el pago donde ya está usado (cheque_propio.pago_compra).'''
    return mock_own_check(
        id=numero, numero=numero, importe=importe, pago_compra=current_payment, **({'estado': estado} if estado else {}),
    )


def _purchase_payment_data(compra, amount=None, **extra):
    '''Pago de una compra: se le aplica amount (por defecto, el importe abonado del pago).'''
    applied = amount if amount is not None else extra.get('importe_abonado')
    return {'proveedor': compra.proveedor, 'compras': [{'compra': compra, 'importe': applied}], **extra}


def _applied(service, payment):
    '''Compras del pago con lo aplicado a cada una: [(compra, importe)].'''
    return [(application.compra, application.importe) for application in service.payment_repository.applications[payment.id]]


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
            **_purchase_payment_data(_make_compra(), importe_abonado=Decimal('1000.00')),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert len(service.check_repository._updated) == 0

    def test_pago_de_una_compra_queda_aplicado_a_esa_compra(self):
        service = _make_service()
        compra = _make_compra()

        payment = service.create_payment({
            **_purchase_payment_data(compra, importe_abonado=Decimal('1000.00')),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert _applied(service, payment) == [(compra, Decimal('1000.00'))]

    def test_pago_de_varias_compras_aplica_a_cada_una_lo_indicado(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('3000.00'))
        older = _make_compra(id=1, importe=Decimal('1000.00'), supplier=supplier)
        newer = _make_compra(id=2, importe=Decimal('2000.00'), supplier=supplier)

        payment = service.create_payment({
            'proveedor': supplier,
            'compras': [{'compra': older, 'importe': Decimal('1000.00')}, {'compra': newer, 'importe': Decimal('1500.00')}],
            'importe_abonado': Decimal('2500.00'),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert _applied(service, payment) == [(older, Decimal('1000.00')), (newer, Decimal('1500.00'))]
        assert supplier.cuenta_corriente == Decimal('500.00')

    def test_lo_que_no_se_aplica_a_compras_queda_a_cuenta(self):
        # El pago vale 1500 pero la compra solo recibe 1000: la diferencia queda a cuenta y el
        # importe entero se descuenta de la cuenta corriente.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
        compra = _make_compra(importe=Decimal('1000.00'), supplier=supplier)

        payment = service.create_payment({
            **_purchase_payment_data(compra, amount=Decimal('1000.00'), importe_abonado=Decimal('1500.00')),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
        })

        assert payment.importe_abonado == Decimal('1500.00')
        assert _applied(service, payment) == [(compra, Decimal('1000.00'))]
        assert supplier.cuenta_corriente == Decimal('3500.00')

    def test_tipo_cheque_registra_cada_cheque_en_el_pago(self):
        # El registro (pago_compra_cheque) es lo que el pago sigue mostrando si después se anula.
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        first = _make_check(100, Decimal('2000.00'), en_cartera)
        second = _make_check(101, Decimal('3000.00'), en_cartera)
        service.check_repository._items.update({100: first, 101: second})

        payment = service.create_payment({
            **_purchase_payment_data(_make_compra(), amount=Decimal('5000.00')),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'cheque_ids': [100, 101],
        })

        assert service.payment_repository.client_checks_recorded[payment.id] == [first, second]

    def test_tipo_cheque_endosa_el_cheque(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        check = _make_check(100, Decimal('5000.00'), en_cartera)
        service.check_repository._items[100] = check

        payment = service.create_payment({
            **_purchase_payment_data(_make_compra(), amount=Decimal('5000.00')),
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
            **_purchase_payment_data(compra, amount=Decimal('1000000.00')),
            # Si llegara un importe, se ignora: el pago vale lo que suman los cheques.
            'importe_abonado': Decimal('1.00'),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'cheque_ids': [100, 101],
        })

        assert payment.importe_abonado == Decimal('1000000.00')
        assert first.pago_compra == payment and second.pago_compra == payment
        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_un_cheque_puede_cubrir_varias_compras(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        service.check_repository._items[100] = _make_check(100, Decimal('3000.00'), en_cartera)
        supplier = mock_supplier(cuenta_corriente=Decimal('3000.00'))
        first = _make_compra(id=1, importe=Decimal('1000.00'), supplier=supplier)
        second = _make_compra(id=2, importe=Decimal('2000.00'), supplier=supplier)

        payment = service.create_payment({
            'proveedor': supplier,
            'compras': [{'compra': first, 'importe': Decimal('1000.00')}, {'compra': second, 'importe': Decimal('2000.00')}],
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'cheque_ids': [100],
        })

        assert _applied(service, payment) == [(first, Decimal('1000.00')), (second, Decimal('2000.00'))]
        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_lo_aplicado_a_las_compras_no_puede_superar_lo_que_suman_los_cheques(self):
        service = _make_service()
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        service.check_repository._items[100] = _make_check(100, Decimal('600.00'), en_cartera)

        with pytest.raises(PaymentApplicationsExceedAmountException):
            service.create_payment({
                **_purchase_payment_data(_make_compra(importe=Decimal('1000.00')), amount=Decimal('700.00')),
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'cheque_ids': [100],
            })
        assert service.check_repository._updated == []

    def test_tipo_cheque_no_encontrado_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(CheckNotFoundException):
            service.create_payment({
                **_purchase_payment_data(_make_compra(), amount=Decimal('100.00')),
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'cheque_ids': [99999],
            })

    def test_aplicado_mayor_al_saldo_de_la_compra_lanza_excepcion(self):
        service = _make_service()
        # compra de $1000, sin pagos → saldo = $1000; se intenta aplicarle $1001
        compra = _make_compra(importe=Decimal('1000.00'), total_payments=Decimal('0.00'))

        with pytest.raises(PaymentExceedsBalanceException):
            service.create_payment({
                **_purchase_payment_data(compra, importe_abonado=Decimal('1001.00')),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })
        assert service.payment_repository.get_all() == []

    def test_saldo_de_la_compra_descuenta_pagos_y_senia(self):
        service = _make_service()
        compra = _make_compra(importe=Decimal('1000.00'), senia=Decimal('200.00'), total_payments=Decimal('300.00'))

        with pytest.raises(PaymentExceedsBalanceException):
            service.create_payment({
                **_purchase_payment_data(compra, importe_abonado=Decimal('500.01')),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })

    def test_aplicado_mayor_al_importe_del_pago_lanza_excepcion(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('3000.00'))
        first = _make_compra(id=1, importe=Decimal('1000.00'), supplier=supplier)
        second = _make_compra(id=2, importe=Decimal('2000.00'), supplier=supplier)

        with pytest.raises(PaymentApplicationsExceedAmountException):
            service.create_payment({
                'proveedor': supplier,
                'compras': [{'compra': first, 'importe': Decimal('1000.00')}, {'compra': second, 'importe': Decimal('1000.00')}],
                'importe_abonado': Decimal('1500.00'),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })
        assert supplier.cuenta_corriente == Decimal('3000.00')

    def test_create_decrementa_cc_proveedor(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('10000.00'))
        compra = _make_compra(importe=Decimal('10000.00'), supplier=supplier)

        service.create_payment({
            **_purchase_payment_data(compra, importe_abonado=Decimal('3000.00')),
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
                'compras': [{'compra': compra, 'importe': Decimal('100.00')}],
                'importe_abonado': Decimal('100.00'),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
            })

        assert service.payment_repository.get_all() == []


# ── Tests: create_payment a cuenta (sin compras) ───────────────────────────────

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

    def test_pago_a_cuenta_descuenta_cc_sin_compras(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('8577000.00'))

        payment = service.create_payment(self._on_account_data(supplier, Decimal('1000000.00')))

        assert _applied(service, payment) == []
        assert payment.proveedor is supplier
        assert supplier.cuenta_corriente == Decimal('7577000.00')
        assert len(service.supplier_repository.updated) == 1

    def test_lista_de_compras_vacia_es_pago_a_cuenta(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))

        payment = service.create_payment(self._on_account_data(supplier, Decimal('400.00'), compras=[]))

        assert _applied(service, payment) == []
        assert supplier.cuenta_corriente == Decimal('600.00')

    def test_pago_a_cuenta_puede_superar_el_saldo_de_compras(self):
        # Sin compras no hay saldo pendiente que validar: el pago es sobre el saldo de la cuenta.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('500.00'))

        service.create_payment(self._on_account_data(supplier, Decimal('800.00')))

        assert supplier.cuenta_corriente == Decimal('-300.00')

    def test_pago_a_cuenta_con_cheque_emitido_lo_usa_entero(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('10000.00'))
        own_check = _make_own_check(importe=Decimal('1000000.00'))
        service.own_check_repository._items[own_check.id] = own_check

        payment = service.create_payment(self._on_account_data(
            supplier, None, tipo_pago=self.tipo_cheque_propio, own_check_ids=[own_check.id],
        ))

        assert service.payment_repository.own_checks_used[payment.id] == [(own_check, Decimal('1000000.00'))]
        assert payment.importe_abonado == Decimal('1000000.00')
        assert own_check.pago_compra is payment

    def test_varios_cheques_emitidos_suman_el_importe_del_pago(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('2000000.00'))
        first = _make_own_check(numero=884, importe=Decimal('1000000.00'))
        second = _make_own_check(numero=885, importe=Decimal('500000.00'))
        service.own_check_repository._items.update({first.id: first, second.id: second})

        payment = service.create_payment(self._on_account_data(
            supplier, None, tipo_pago=self.tipo_cheque_propio, own_check_ids=[884, 885],
        ))

        assert payment.importe_abonado == Decimal('1500000.00')
        assert service.payment_repository.own_checks_used[payment.id] == [(first, Decimal('1000000.00')), (second, Decimal('500000.00'))]
        assert supplier.cuenta_corriente == Decimal('500000.00')

    def test_cheque_emitido_ya_usado_en_un_pago_vigente_lanza_excepcion(self):
        service = _make_service()
        own_check = _make_own_check(numero=885, current_payment=mock_purchase_payment(id=120))
        service.own_check_repository._items[own_check.id] = own_check
        supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))

        with pytest.raises(OwnCheckNotAvailableException, match='El cheque N° 885 ya se usó en el pago N° 00000120.'):
            service.create_payment(self._on_account_data(supplier, None, tipo_pago=self.tipo_cheque_propio, own_check_ids=[885]))

        assert supplier.cuenta_corriente == Decimal('1000.00')

    @pytest.mark.parametrize('estado, label', [('COBRADO', 'cobrado'), ('ANULADO', 'anulado'), ('RECHAZADO', 'rechazado')])
    def test_cheque_propio_no_emitido_lanza_excepcion(self, estado, label):
        service = _make_service()
        own_check = _make_own_check(numero=885, importe=Decimal('500000.00'), estado=estado)
        service.own_check_repository._items[own_check.id] = own_check
        supplier = mock_supplier(cuenta_corriente=Decimal('1000000.00'))

        with pytest.raises(OwnCheckNotAvailableException, match=f'El cheque N° 885 está {label}: solo se pueden usar cheques emitidos.'):
            service.create_payment(self._on_account_data(supplier, None, tipo_pago=self.tipo_cheque_propio, own_check_ids=[885]))

        assert supplier.cuenta_corriente == Decimal('1000000.00')
        assert service.payment_repository.own_checks_used == {}

    def test_cheque_emitido_no_encontrado_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(OwnCheckNotFoundException):
            service.create_payment(self._on_account_data(
                mock_supplier(cuenta_corriente=Decimal('10000.00')), None, tipo_pago=self.tipo_cheque_propio, own_check_ids=[404],
            ))


# ── Tests: delete_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCancelPurchasePayment:
    '''Anular un pago (borrado lógico): queda como registro y se revierten sus efectos.'''

    def setup_method(self):
        self.tipo_efectivo = make_payment_type(descripcion='Efectivo')
        self.tipo_cheque = make_payment_type(descripcion='Cheque')
        self.tipo_cheque_propio = make_payment_type(descripcion='Cheque Propio')
        make_check_state(descripcion=check_status.EN_CARTERA)

    def _create(self, service, amount, supplier, tipo=None, compras=()):
        payment = service.payment_repository.create(
            proveedor=supplier, importe_abonado=amount, tipo_pago=tipo or self.tipo_efectivo, fecha_pago='2024-01-01',
        )
        service.payment_repository.replace_purchase_applications(payment, list(compras))
        return payment

    def test_anula_el_pago_sin_borrarlo_y_conserva_sus_compras(self):
        service = _make_service()
        compra = _make_compra()
        payment = self._create(service, Decimal('1000.00'), compra.proveedor, compras=[(compra, Decimal('1000.00'))])

        cancelled = service.cancel_payment(payment.id)

        assert cancelled is payment
        assert payment.estado_pago == 'ANULADO'
        assert payment.fecha_anulacion is not None
        assert service.payment_repository.get_by_id(payment.id) is payment
        # La imputación queda como registro; las compras dejan de contarla por el estado del pago.
        assert _applied(service, payment) == [(compra, Decimal('1000.00'))]

    def test_efectivo_devuelve_el_importe_a_la_cuenta_corriente(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(importe=Decimal('10000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), supplier, compras=[(compra, Decimal('3000.00'))])

        service.cancel_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('10000.00')
        assert len(service.supplier_repository.updated) == 1

    def test_pago_a_cuenta_devuelve_el_importe_al_proveedor(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7577000.00'))
        payment = self._create(service, Decimal('1000000.00'), supplier)

        service.cancel_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('8577000.00')
        assert payment.estado_pago == 'ANULADO'

    def test_cheques_de_clientes_vuelven_a_cartera(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('2000.00'), supplier, tipo=self.tipo_cheque)
        en_cartera = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
        check = _make_check(55555, Decimal('2000.00'), Mock())
        check.endosado = True
        _attach_checks(payment, [check])

        service.cancel_payment(payment.id)

        assert check.endosado is False
        assert check.estado == en_cartera
        assert check.pago_compra is None
        assert supplier.cuenta_corriente == Decimal('2000.00')

    def test_no_devuelve_dos_veces_lo_de_un_cheque_rechazado_y_lo_deja_como_registro(self):
        # El pago era de 5000 con dos cheques; al rechazar el de 2000 se le devolvió al proveedor
        # y el pago bajó a 3000. Al anularlo vuelve solo lo que queda; el rechazado sigue en el pago.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('3000.00'))
        payment = self._create(service, Decimal('3000.00'), supplier, tipo=self.tipo_cheque)
        rejected_state = mock_check_state(descripcion=check_status.RECHAZADO)
        rejected = _make_check(1, Decimal('2000.00'), rejected_state)
        endorsed = _make_check(2, Decimal('3000.00'), Mock())
        _attach_checks(payment, [rejected, endorsed])

        service.cancel_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('6000.00')
        assert rejected.estado is rejected_state
        assert endorsed.pago_compra is None

    def test_cheques_propios_emitidos_quedan_libres_y_en_el_historial(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('700000.00'), supplier, tipo=self.tipo_cheque_propio)
        own_check = mock_own_check(numero=884, estado='EMITIDO', pago_compra=payment)
        service.payment_repository.add_own_check_use(payment, own_check, Decimal('700000.00'))

        service.cancel_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('700000.00')
        assert payment.estado_pago == 'ANULADO'
        assert own_check.estado == 'EMITIDO'
        assert own_check.pago_compra is None
        assert service.payment_repository.own_checks_used[payment.id] == [(own_check, Decimal('700000.00'))]

    def test_un_cheque_propio_rechazado_sigue_vinculado_al_pago_anulado(self):
        # Igual que el cheque de cliente rechazado: su importe ya se devolvió y queda en el pago.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('0.00'), supplier, tipo=self.tipo_cheque_propio)
        own_check = mock_own_check(numero=884, estado='RECHAZADO', pago_compra=payment)
        service.payment_repository.add_own_check_use(payment, own_check, Decimal('700000.00'))

        service.cancel_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('0.00')
        assert own_check.pago_compra is payment

    def test_no_se_anula_un_pago_con_un_cheque_propio_cobrado(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('500000.00'), supplier, tipo=self.tipo_cheque_propio)
        service.payment_repository.add_own_check_use(payment, mock_own_check(numero=885, estado='COBRADO'), Decimal('500000.00'))

        with pytest.raises(PaymentCancelBlockedException, match='el cheque N° 885 ya se cobró'):
            service.cancel_payment(payment.id)

        assert payment.estado_pago == 'VIGENTE'
        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_no_se_anula_dos_veces(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('1000.00'), supplier)
        service.cancel_payment(payment.id)

        with pytest.raises(PaymentCancelBlockedException, match='ya está anulado'):
            service.cancel_payment(payment.id)

        assert supplier.cuenta_corriente == Decimal('1000.00')

    def test_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(PurchasePaymentNotFoundException):
            service.cancel_payment(9999)


# ── Tests: update_payment ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUpdatePurchasePayment:

    def setup_method(self):
        self.tipo_efectivo = make_payment_type(descripcion='Efectivo')
        self.tipo_cheque_propio = make_payment_type(descripcion='Cheque Propio')

    def _create(self, service, amount, compra=None, supplier=None, tipo=None, applied=None):
        payment = service.payment_repository.create(
            proveedor=supplier or compra.proveedor,
            importe_abonado=amount,
            tipo_pago=tipo or self.tipo_efectivo,
            fecha_pago='2026-10-01',
        )
        if compra:
            service.payment_repository.replace_purchase_applications(payment, [(compra, applied or amount)])
        return payment

    def test_no_se_edita_un_pago_anulado(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)
        payment.estado_pago = 'ANULADO'

        with pytest.raises(PaymentEditBlockedException, match='pago anulado'):
            service.update_payment(payment.id, {'fecha_pago': '2026-10-05'})

    def test_cambia_fecha_sin_tocar_cuenta_corriente(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(supplier=supplier, total_payments=Decimal('3000.00'))
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        updated = service.update_payment(payment.id, {'importe_abonado': Decimal('3000.00'), 'fecha_pago': '2026-10-05'})

        assert updated.fecha_pago == '2026-10-05'
        assert supplier.cuenta_corriente == Decimal('7000.00')
        assert service.supplier_repository.updated == []
        assert _applied(service, payment) == [(compra, Decimal('3000.00'))]

    def test_subir_importe_descuenta_la_diferencia_de_la_cuenta_corriente(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        payment = self._create(service, Decimal('3000.00'), supplier=supplier)

        updated = service.update_payment(payment.id, {'importe_abonado': Decimal('5000.00'), 'fecha_pago': '2026-10-01'})

        assert updated.importe_abonado == Decimal('5000.00')
        assert supplier.cuenta_corriente == Decimal('5000.00')

    def test_bajar_importe_devuelve_la_diferencia_a_la_cuenta_corriente(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        service.update_payment(payment.id, {
            'importe_abonado': Decimal('1000.00'),
            'fecha_pago': '2026-10-01',
            'compras': [{'compra': compra, 'importe': Decimal('1000.00')}],
        })

        assert supplier.cuenta_corriente == Decimal('9000.00')
        assert _applied(service, payment) == [(compra, Decimal('1000.00'))]

    def test_bajar_importe_por_debajo_de_lo_aplicado_sin_cambiar_compras_lanza_excepcion(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        with pytest.raises(PaymentApplicationsExceedAmountException):
            service.update_payment(payment.id, {'importe_abonado': Decimal('1000.00'), 'fecha_pago': '2026-10-01'})
        assert supplier.cuenta_corriente == Decimal('7000.00')

    def test_aplicado_puede_llegar_al_total_de_la_compra(self):
        # La compra de $10000 tiene $3000 aplicados por este pago: el saldo disponible para
        # este pago es $7000 + lo que ya le aplicaba.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        service.update_payment(payment.id, {
            'importe_abonado': Decimal('10000.00'),
            'fecha_pago': '2026-10-01',
            'compras': [{'compra': compra, 'importe': Decimal('10000.00')}],
        })

        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_aplicado_mayor_al_saldo_de_la_compra_lanza_excepcion(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('7000.00'))
        compra = _make_compra(total_payments=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        with pytest.raises(PaymentExceedsBalanceException):
            service.update_payment(payment.id, {
                'importe_abonado': Decimal('10000.01'),
                'fecha_pago': '2026-10-01',
                'compras': [{'compra': compra, 'importe': Decimal('10000.01')}],
            })
        assert supplier.cuenta_corriente == Decimal('7000.00')

    def test_cambiar_las_compras_reemplaza_lo_aplicado(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('5000.00'))
        first = _make_compra(id=1, importe=Decimal('2000.00'), total_payments=Decimal('2000.00'), supplier=supplier)
        second = _make_compra(id=2, importe=Decimal('3000.00'), supplier=supplier)
        payment = self._create(service, Decimal('2000.00'), compra=first)

        service.update_payment(payment.id, {
            'importe_abonado': Decimal('2000.00'),
            'fecha_pago': '2026-10-01',
            'compras': [{'compra': first, 'importe': Decimal('500.00')}, {'compra': second, 'importe': Decimal('1500.00')}],
        })

        assert _applied(service, payment) == [(first, Decimal('500.00')), (second, Decimal('1500.00'))]
        assert service.supplier_repository.updated == []

    def test_compras_vacias_pasan_el_pago_a_cuenta(self):
        service = _make_service()
        compra = _make_compra(total_payments=Decimal('3000.00'))
        payment = self._create(service, Decimal('3000.00'), compra=compra)

        service.update_payment(payment.id, {'importe_abonado': Decimal('3000.00'), 'fecha_pago': '2026-10-01', 'compras': []})

        assert _applied(service, payment) == []

    def test_compra_de_otro_proveedor_lanza_excepcion(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))
        payment = self._create(service, Decimal('1000.00'), supplier=supplier)
        other = _make_compra(supplier=mock_supplier())

        with pytest.raises(PaymentSupplierMismatchException):
            service.update_payment(payment.id, {
                'importe_abonado': Decimal('1000.00'),
                'fecha_pago': '2026-10-01',
                'compras': [{'compra': other, 'importe': Decimal('100.00')}],
            })
        assert _applied(service, payment) == []

    def test_pago_a_cuenta_no_tiene_tope(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('1000.00'))
        payment = self._create(service, Decimal('1000.00'), supplier=supplier)

        service.update_payment(payment.id, {'importe_abonado': Decimal('5000.00'), 'fecha_pago': '2026-10-01'})

        assert supplier.cuenta_corriente == Decimal('-3000.00')

    def test_pago_con_cheques_emitidos_no_cambia_el_importe(self):
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('0.00'))
        payment = self._create(service, Decimal('400.00'), supplier=supplier, tipo=self.tipo_cheque_propio)
        service.payment_repository.add_own_check_use(payment, _make_own_check(), Decimal('400.00'))

        with pytest.raises(PaymentEditBlockedException):
            service.update_payment(payment.id, {'importe_abonado': Decimal('800.00'), 'fecha_pago': '2026-10-01'})
        service.update_payment(payment.id, {'fecha_pago': '2026-10-09'})

        assert payment.fecha_pago == '2026-10-09'
        assert payment.importe_abonado == Decimal('400.00')
        assert supplier.cuenta_corriente == Decimal('0.00')

    def test_pago_con_cheques_de_clientes_puede_cambiar_sus_compras(self):
        # Un pago a cuenta con un cheque que en realidad cubría compras se puede repartir después.
        service = _make_service()
        supplier = mock_supplier(cuenta_corriente=Decimal('10000.00'))
        payment = self._create(service, Decimal('2000.00'), supplier=supplier)
        _attach_checks(payment, [_make_check(1, Decimal('2000.00'), Mock())])
        first = _make_compra(id=1, importe=Decimal('1200.00'), supplier=supplier)
        second = _make_compra(id=2, importe=Decimal('800.00'), supplier=supplier)

        with pytest.raises(PaymentEditBlockedException):
            service.update_payment(payment.id, {'importe_abonado': Decimal('1500.00'), 'fecha_pago': '2026-10-01'})
        service.update_payment(payment.id, {
            'fecha_pago': '2026-10-09',
            'compras': [{'compra': first, 'importe': Decimal('1200.00')}, {'compra': second, 'importe': Decimal('800.00')}],
        })

        assert payment.fecha_pago == '2026-10-09'
        assert _applied(service, payment) == [(first, Decimal('1200.00')), (second, Decimal('800.00'))]
        assert supplier.cuenta_corriente == Decimal('10000.00')

    def test_update_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(PurchasePaymentNotFoundException):
            service.update_payment(9999, {'importe_abonado': Decimal('1.00'), 'fecha_pago': '2026-10-01'})


# ── Tests: reduce_payment_amount ───────────────────────────────────────────────

class TestReducePaymentAmount:
    '''Lo que se cae de un pago (un cheque rechazado) se descuenta de la compra más nueva a la más vieja.'''

    def _payment_with(self, amount, purchases):
        repo = FakePurchasePaymentRepo()
        supplier = mock_supplier()
        payment = repo.create(proveedor=supplier, importe_abonado=amount, tipo_pago=Mock(), fecha_pago='2026-10-01')
        repo.replace_purchase_applications(payment, purchases)
        return repo, payment

    def test_descuenta_primero_de_la_compra_mas_nueva(self):
        older = mock_purchase(id=1, fecha=datetime.date(2026, 1, 10))
        newer = mock_purchase(id=2, fecha=datetime.date(2026, 2, 10))
        repo, payment = self._payment_with(Decimal('3000.00'), [(older, Decimal('1000.00')), (newer, Decimal('2000.00'))])

        reduce_payment_amount(repo, payment, Decimal('2500.00'))

        assert payment.importe_abonado == Decimal('500.00')
        assert [(a.compra, a.importe) for a in repo.applications[payment.id]] == [
            (older, Decimal('500.00')), (newer, Decimal('0.00')),
        ]

    def test_misma_fecha_descuenta_primero_de_la_compra_cargada_despues(self):
        first = mock_purchase(id=1, fecha=datetime.date(2026, 1, 10))
        second = mock_purchase(id=2, fecha=datetime.date(2026, 1, 10))
        repo, payment = self._payment_with(Decimal('2000.00'), [(first, Decimal('1000.00')), (second, Decimal('1000.00'))])

        reduce_payment_amount(repo, payment, Decimal('1000.00'))

        assert [(a.compra, a.importe) for a in repo.applications[payment.id]] == [
            (first, Decimal('1000.00')), (second, Decimal('0.00')),
        ]

    def test_lo_que_no_alcanzan_las_compras_sale_de_lo_que_estaba_a_cuenta(self):
        buy = mock_purchase(id=1)
        repo, payment = self._payment_with(Decimal('1500.00'), [(buy, Decimal('1000.00'))])

        reduce_payment_amount(repo, payment, Decimal('1200.00'))

        assert payment.importe_abonado == Decimal('300.00')
        assert [a.importe for a in repo.applications[payment.id]] == [Decimal('0.00')]

    def test_pago_que_queda_sin_nada_no_se_elimina(self):
        buy = mock_purchase(id=1)
        repo, payment = self._payment_with(Decimal('1000.00'), [(buy, Decimal('1000.00'))])

        reduce_payment_amount(repo, payment, Decimal('1000.00'))

        assert repo.get_by_id(payment.id) is payment
        assert payment.importe_abonado == Decimal('0.00')
        # La compra sigue asociada, sin nada aplicado: es el registro del pago que tuvo.
        assert [(a.compra, a.importe) for a in repo.applications[payment.id]] == [(buy, Decimal('0.00'))]

    def test_pago_a_cuenta_solo_baja_su_importe(self):
        repo, payment = self._payment_with(Decimal('1000.00'), [])

        reduce_payment_amount(repo, payment, Decimal('400.00'))

        assert payment.importe_abonado == Decimal('600.00')

    def test_el_importe_del_pago_nunca_queda_negativo(self):
        repo, payment = self._payment_with(Decimal('300.00'), [])

        reduce_payment_amount(repo, payment, Decimal('500.00'))

        assert payment.importe_abonado == Decimal('0.00')
