import pytest
from decimal import Decimal
from unittest.mock import Mock

from banco.models import Banco
from estado_cheque.models import EstadoCheque
from tipo_pago.models import TipoPago
from cheque.interfaces import ICheckRepository
from pago_cliente.interfaces import IClientPaymentRepository
from pago_cliente.service import ClientPaymentService
from pago_cliente.exceptions import (
    ClientPaymentNotFoundException,
    CheckAlreadyExistsException,
    PaymentDeletionBlockedException,
    CheckEditBlockedException,
)


# ── Fake repos ────────────────────────────────────────────────────────────────

class FakeCheckRepo(ICheckRepository):
    def __init__(self):
        self._items = {}
        self._created = []
        self._updated = []
        self._next_id = 1

    def get_all(self):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(id)

    def exists_duplicate(self, number, bank, client, exclude_id=None):
        for check in self._items.values():
            if exclude_id is not None and check.id == exclude_id:
                continue
            if check.numero == number and check.banco == bank and check.pago_cliente and check.pago_cliente.cliente == client:
                return True
        return False

    def create(self, data):
        check = Mock()
        check.id = self._next_id
        self._next_id += 1
        check.numero = data['numero']
        check.importe = data['importe']
        check.banco = data['banco']
        check.estado = data['estado']
        check.fecha_emision = data['fecha_emision']
        check.fecha_deposito = data.get('fecha_deposito')
        check.pago_cliente = data.get('pago_cliente')
        check.endosado = data.get('endosado', False)
        self._items[data['numero']] = check
        self._created.append(data)
        return check

    def update(self, check, data):
        for k, v in data.items():
            setattr(check, k, v)
        self._updated.append(data)
        return check

    def delete(self, check):
        self._items.pop(check.numero, None)


class FakePaymentRepo(IClientPaymentRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1
        self._last_update_data = None

    def get_all(self, client_id=None):
        items = list(self._items.values())
        if client_id:
            items = [p for p in items if p.cliente_id == client_id]
        return items

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, client, payment_type, payment_date, amount, observations=None):
        payment = Mock()
        payment.id = self._next_id
        self._next_id += 1
        payment.cliente = client
        payment.cliente_id = client.id
        payment.tipo_pago = payment_type
        payment.importe = amount
        payment.fecha_pago = payment_date
        payment.observaciones = observations
        payment.cheque_set = Mock()
        payment.cheque_set.first = Mock(return_value=None)
        self._items[payment.id] = payment
        return payment

    def update(self, payment, data):
        self._last_update_data = dict(data)
        for k, v in data.items():
            setattr(payment, k, v)
        return payment

    def save(self, payment):
        return payment

    def delete(self, payment):
        self._items.pop(payment.id, None)
        payment.id = None


class FakeClientRepo:
    def update_balance(self, client):
        pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_client(cuenta_corriente=Decimal('10000.00')):
    client = Mock()
    client.id = 1
    client.cuenta_corriente = cuenta_corriente
    return client


def _make_service():
    return ClientPaymentService(
        payment_repository=FakePaymentRepo(),
        client_repository=FakeClientRepo(),
        check_repository=FakeCheckRepo(),
    )


# ── Tests: create_payment ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreatePayment:
    def setup_method(self):
        self.banco = Banco.objects.create(descripcion='Nación')
        EstadoCheque.objects.create(descripcion='EN_CARTERA')
        self.tipo_efectivo = TipoPago.objects.create(descripcion='Efectivo')
        self.tipo_cheque = TipoPago.objects.create(descripcion='Cheque')

    def test_tipo_efectivo_no_crea_cheque(self):
        service = _make_service()

        service.create_payment({
            'cliente': _make_client(),
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
        })

        assert len(service.check_repository._created) == 0

    def test_tipo_cheque_crea_cheque_en_cartera(self):
        service = _make_service()

        payment = service.create_payment({
            'cliente': _make_client(),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('5000.00'),
            'cheque_numero': 12345,
            'cheque_banco': self.banco,
            'cheque_fecha_emision': '2024-01-01',
        })

        assert len(service.check_repository._created) == 1
        created = service.check_repository._created[0]
        assert created['numero'] == 12345
        assert created['importe'] == Decimal('5000.00')
        assert created['estado'].descripcion == 'EN_CARTERA'
        assert created['endosado'] is False
        assert created['pago_cliente'] == payment

    def test_tipo_cheque_diferido_guarda_fecha_deposito(self):
        service = _make_service()

        service.create_payment({
            'cliente': _make_client(),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('3000.00'),
            'cheque_numero': 99999,
            'cheque_banco': self.banco,
            'cheque_fecha_emision': '2024-01-01',
            'cheque_fecha_deposito': '2024-02-15',
        })

        created = service.check_repository._created[0]
        assert created['fecha_deposito'] == '2024-02-15'

    def test_tipo_cheque_sin_fecha_deposito_guarda_none(self):
        service = _make_service()

        service.create_payment({
            'cliente': _make_client(),
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('3000.00'),
            'cheque_numero': 11111,
            'cheque_banco': self.banco,
            'cheque_fecha_emision': '2024-01-01',
        })

        created = service.check_repository._created[0]
        assert created['fecha_deposito'] is None

    def test_cheque_duplicado_lanza_excepcion(self):
        service = _make_service()
        service.check_repository.exists_duplicate = Mock(return_value=True)

        with pytest.raises(CheckAlreadyExistsException):
            service.create_payment({
                'cliente': _make_client(),
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('5000.00'),
                'cheque_numero': 12345,
                'cheque_banco': self.banco,
                'cheque_fecha_emision': '2024-01-01',
            })

        assert len(service.check_repository._created) == 0

    def test_descuenta_cuenta_corriente_del_cliente(self):
        service = _make_service()
        client = _make_client(cuenta_corriente=Decimal('10000.00'))

        service.create_payment({
            'cliente': client,
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('3000.00'),
        })

        assert client.cuenta_corriente == Decimal('7000.00')


# ── Tests: update_payment ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUpdatePayment:
    def setup_method(self):
        self.banco_nacion = Banco.objects.create(descripcion='Nación')
        self.banco_galicia = Banco.objects.create(descripcion='Galicia')
        self.tipo_cheque = TipoPago.objects.create(descripcion='Cheque')
        self.tipo_efectivo = TipoPago.objects.create(descripcion='Efectivo')

    def _make_payment_with_check(self, service, importe=Decimal('1000.00')):
        client = _make_client()
        payment = service.payment_repository.create(
            client=client,
            payment_type=self.tipo_cheque,
            payment_date='2024-01-01',
            amount=importe,
        )
        check = Mock()
        check.importe = importe
        check.banco = self.banco_nacion
        check.numero = 5001
        check.id = 1
        check.endosado = False
        check.fecha_emision = '2024-01-01'
        check.fecha_deposito = None
        payment.cheque_set.first = Mock(return_value=check)
        return payment, check, client

    def test_update_importe_actualiza_cheque(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('2000.00'),
        })

        assert check.importe == Decimal('2000.00')

    def test_update_banco_actualiza_cheque(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
            'cheque_banco': self.banco_galicia,
        })

        assert check.banco == self.banco_galicia

    def test_update_numero_actualiza_cheque(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
            'cheque_numero': 9999,
        })

        assert check.numero == 9999

    def test_update_numero_banco_o_importe_bloqueado_si_cheque_endosado(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)
        check.endosado = True
        pago_compra = Mock()
        pago_compra.compra.proveedor.nombre = 'Proveedor Test'
        pago_compra.fecha_pago = '2024-02-01'
        check.pago_compra = pago_compra

        with pytest.raises(CheckEditBlockedException):
            service.update_payment(payment.id, {
                'cliente': client,
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('1000.00'),
                'cheque_numero': 9999,
            })

    def test_update_fecha_emision_bloqueado_si_cheque_endosado(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)
        check.endosado = True

        with pytest.raises(CheckEditBlockedException):
            service.update_payment(payment.id, {
                'cliente': client,
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('1000.00'),
                'cheque_fecha_emision': '2024-03-01',
            })

    def test_update_fecha_deposito_bloqueado_si_cheque_endosado(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)
        check.endosado = True

        with pytest.raises(CheckEditBlockedException):
            service.update_payment(payment.id, {
                'cliente': client,
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('1000.00'),
                'cheque_fecha_deposito': '2024-03-01',
            })

    def test_update_observaciones_permitido_aunque_cheque_este_endosado(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)
        check.endosado = True

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
            'observaciones': 'nota nueva',
        })

        update_data = service.payment_repository._last_update_data
        assert update_data.get('observaciones') == 'nota nueva'

    def test_update_banco_duplicado_lanza_excepcion(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)
        check.id = 1
        check.numero = 5001
        service.check_repository.exists_duplicate = Mock(return_value=True)

        with pytest.raises(CheckAlreadyExistsException):
            service.update_payment(payment.id, {
                'cliente': client,
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('1000.00'),
                'cheque_banco': self.banco_galicia,
            })

    def test_update_cliente_con_cheque_duplicado_en_nuevo_cliente_lanza_excepcion(self):
        service = _make_service()
        payment, check, old_client = self._make_payment_with_check(service)
        check.id = 1
        check.numero = 5001
        new_client = _make_client()
        new_client.id = 2
        service.check_repository.exists_duplicate = Mock(return_value=True)

        with pytest.raises(CheckAlreadyExistsException):
            service.update_payment(payment.id, {
                'cliente': new_client,
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('1000.00'),
            })

    def test_update_fecha_deposito_actualiza_cheque(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
            'cheque_fecha_deposito': '2024-03-01',
        })

        assert check.fecha_deposito == '2024-03-01'

    def test_campos_cheque_no_llegan_al_payment_update(self):
        service = _make_service()
        payment, check, client = self._make_payment_with_check(service)

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_cheque,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
            'cheque_banco': self.banco_galicia,
            'cheque_fecha_emision': '2024-01-15',
            'cheque_fecha_deposito': '2024-03-01',
        })

        update_data = service.payment_repository._last_update_data
        assert 'cheque_banco' not in update_data
        assert 'cheque_fecha_emision' not in update_data
        assert 'cheque_fecha_deposito' not in update_data

    def test_update_cambia_a_cheque_duplicado_lanza_excepcion(self):
        service = _make_service()
        client = _make_client()
        payment = service.payment_repository.create(
            client=client,
            payment_type=self.tipo_efectivo,
            payment_date='2024-01-01',
            amount=Decimal('1000.00'),
        )
        payment.cheque_set.first = Mock(return_value=None)
        service.check_repository.exists_duplicate = Mock(return_value=True)

        with pytest.raises(CheckAlreadyExistsException):
            service.update_payment(payment.id, {
                'cliente': client,
                'tipo_pago': self.tipo_cheque,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('1000.00'),
                'cheque_numero': 7001,
                'cheque_banco': self.banco_nacion,
                'cheque_fecha_emision': '2024-01-01',
            })

        assert len(service.check_repository._created) == 0

    def test_update_sin_cheque_asociado_no_falla(self):
        service = _make_service()
        client = _make_client()
        payment = service.payment_repository.create(
            client=client,
            payment_type=self.tipo_efectivo,
            payment_date='2024-01-01',
            amount=Decimal('1000.00'),
        )
        payment.cheque_set.first = Mock(return_value=None)

        result = service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1500.00'),
        })

        assert result is not None
        assert len(service.check_repository._updated) == 0

    def test_update_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(ClientPaymentNotFoundException):
            service.update_payment(9999, {
                'cliente': _make_client(),
                'tipo_pago': self.tipo_efectivo,
                'fecha_pago': '2024-01-01',
                'importe': Decimal('100.00'),
            })

    def test_update_ajusta_cc_cuando_cambia_importe(self):
        service = _make_service()
        client = _make_client(cuenta_corriente=Decimal('5000.00'))
        payment = service.payment_repository.create(
            client=client,
            payment_type=self.tipo_efectivo,
            payment_date='2024-01-01',
            amount=Decimal('1000.00'),
        )
        payment.cheque_set.first = Mock(return_value=None)

        service.update_payment(payment.id, {
            'cliente': client,
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1500.00'),
        })

        # diferencia = 1500 - 1000 = 500 → CC baja 500
        assert client.cuenta_corriente == Decimal('4500.00')

    def test_update_ajusta_cc_cuando_cambia_cliente(self):
        service = _make_service()
        old_client = _make_client(cuenta_corriente=Decimal('3000.00'))
        old_client.id = 1
        new_client = _make_client(cuenta_corriente=Decimal('8000.00'))
        new_client.id = 2

        payment = service.payment_repository.create(
            client=old_client,
            payment_type=self.tipo_efectivo,
            payment_date='2024-01-01',
            amount=Decimal('1000.00'),
        )
        payment.cheque_set.first = Mock(return_value=None)

        service.update_payment(payment.id, {
            'cliente': new_client,
            'tipo_pago': self.tipo_efectivo,
            'fecha_pago': '2024-01-01',
            'importe': Decimal('1000.00'),
        })

        assert old_client.cuenta_corriente == Decimal('4000.00')  # se le devuelve el pago
        assert new_client.cuenta_corriente == Decimal('7000.00')  # se le descuenta


# ── Tests: delete_payment ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeletePayment:
    def setup_method(self):
        self.tipo_cheque = TipoPago.objects.create(descripcion='Cheque')
        self.tipo_efectivo = TipoPago.objects.create(descripcion='Efectivo')

    def _make_payment(self, service, tipo_pago, with_check=False, endosado=False):
        client = _make_client()
        payment = service.payment_repository.create(
            client=client,
            payment_type=tipo_pago,
            payment_date='2024-01-01',
            amount=Decimal('1000.00'),
        )
        if with_check:
            check = Mock()
            check.numero = 12345
            check.endosado = endosado
            service.check_repository._items[check.numero] = check
            payment.cheque_set.first = Mock(return_value=check)
            return payment, client, check
        else:
            payment.cheque_set.first = Mock(return_value=None)
        return payment, client, None

    def test_delete_pago_con_cheque_elimina_el_cheque(self):
        service = _make_service()
        payment, client, check = self._make_payment(service, self.tipo_cheque, with_check=True)
        payment_id = payment.id

        service.delete_payment(payment_id)

        assert service.payment_repository.get_by_id(payment_id) is None
        assert service.check_repository.get_by_id(12345) is None

    def test_delete_pago_con_cheque_endosado_lanza_excepcion(self):
        service = _make_service()
        payment, client, check = self._make_payment(service, self.tipo_cheque, with_check=True, endosado=True)
        pago_compra = Mock()
        pago_compra.compra.proveedor.nombre = 'Proveedor Test'
        pago_compra.fecha_pago = '2024-02-01'
        check.pago_compra = pago_compra

        with pytest.raises(PaymentDeletionBlockedException):
            service.delete_payment(payment.id)

        # el pago y el cheque siguen existiendo, nada se revirtió
        assert service.payment_repository.get_by_id(payment.id) is not None
        assert service.check_repository.get_by_id(12345) is not None

    def test_delete_pago_sin_cheque_no_falla(self):
        service = _make_service()
        payment, client, check = self._make_payment(service, self.tipo_efectivo, with_check=False)
        payment_id = payment.id

        service.delete_payment(payment_id)

        assert service.payment_repository.get_by_id(payment_id) is None

    def test_delete_revierte_cuenta_corriente(self):
        service = _make_service()
        client = _make_client(cuenta_corriente=Decimal('5000.00'))
        payment = service.payment_repository.create(
            client=client,
            payment_type=self.tipo_efectivo,
            payment_date='2024-01-01',
            amount=Decimal('2000.00'),
        )
        payment.cheque_set.first = Mock(return_value=None)

        service.delete_payment(payment.id)

        assert client.cuenta_corriente == Decimal('7000.00')

    def test_delete_not_found_lanza_excepcion(self):
        service = _make_service()

        with pytest.raises(ClientPaymentNotFoundException):
            service.delete_payment(9999)
