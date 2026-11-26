import pytest
from decimal import Decimal

from cheque.interfaces import ICheckRepository
from pago_cliente.interfaces import IClientPaymentRepository
from pago_cliente.service import ClientPaymentService, apply_rejected_check
from pago_cliente.exceptions import (
    ClientPaymentNotFoundException,
    CheckAlreadyExistsException,
    PaymentCancelBlockedException,
    PaymentEditBlockedException,
    CheckEditBlockedException,
)
from core.tests.factories import make_check_state
from core.tests.mocks import (
    mock_bank, mock_check, mock_check_state, mock_client, mock_client_payment, mock_payment_type,
    mock_purchase_payment, mock_supplier,
)


# ── Fake repos ────────────────────────────────────────────────────────────────

class FakeCheckRepo(ICheckRepository):
    '''Guarda los cheques en memoria y los suma a payment.cheque_set.all() del pago.'''

    def __init__(self):
        self._items = {}
        self._next_id = 1
        self._recorded = {}

    def get_all(self, **kwargs):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(id)

    def exists_duplicate(self, number, bank, client, exclude_id=None):
        return any(
            check.id != exclude_id
            and check.numero == number and check.banco == bank
            and check.pago_cliente.cliente == client
            and check.estado.descripcion != 'ANULADO'
            for check in self._items.values()
        )

    def create(self, data):
        check = mock_check(id=self._next_id, **data)
        self._next_id += 1
        self._items[check.id] = check
        data['pago_cliente'].cheque_set.all.return_value.append(check)
        return check

    def update(self, check, data):
        for key, value in data.items():
            setattr(check, key, value)
        return check

    def delete(self, check):
        self._items.pop(check.id, None)
        check.pago_cliente.cheque_set.all.return_value.remove(check)

    def get_purchase_payment_ids(self, check):
        return self._recorded.get(check.id, [])


class FakePaymentRepo(IClientPaymentRepository):
    def __init__(self):
        self._items = {}

    def get_all(self, **kwargs):
        return list(self._items.values())

    def get_by_id(self, id):
        return self._items.get(int(id))

    def create(self, client, payment_type, payment_date, amount, observations=None):
        payment = mock_client_payment(
            cliente=client, tipo_pago=payment_type, importe=amount, fecha_pago=payment_date, observaciones=observations,
        )
        self._items[payment.id] = payment
        return payment

    def save(self, payment):
        return payment

    def update(self, payment, data):
        for key, value in data.items():
            setattr(payment, key, value)
        return payment


class FakeClientRepo:
    def update_balance(self, client):
        pass


# ── Helpers ───────────────────────────────────────────────────────────────────

@pytest.fixture
def check_states(db):
    return {
        description: make_check_state(descripcion=description)
        for description in ('EN_CARTERA', 'ANULADO', 'RECHAZADO')
    }


@pytest.fixture
def service(check_states):
    return ClientPaymentService(
        payment_repository=FakePaymentRepo(),
        client_repository=FakeClientRepo(),
        check_repository=FakeCheckRepo(),
    )


CHECK_TYPE = mock_payment_type(descripcion='Cheque')
CASH_TYPE = mock_payment_type(descripcion='Efectivo')
BANK = mock_bank(descripcion='Nación')
OTHER_BANK = mock_bank(descripcion='Galicia')


def _check(numero, importe='1000.00', banco=BANK, **extra):
    return {'numero': numero, 'banco': banco, 'importe': Decimal(importe), 'fecha_emision': '2024-01-01', **extra}


def _create(service, client, checks=None, amount=None, payment_type=None):
    checks = checks or []
    total = sum((check['importe'] for check in checks), Decimal('0'))
    return service.create_payment({
        'cliente': client,
        'tipo_pago': payment_type or (CHECK_TYPE if checks else CASH_TYPE),
        'fecha_pago': '2024-01-01',
        'importe': amount if amount is not None else total,
        'cheques': checks,
    })


def _edit_entries(payment, **changes_by_number):
    '''Los cheques del pago como los manda el formulario al editar, con los cambios indicados.'''
    return [
        {
            'id': check.id, 'numero': check.numero, 'banco': check.banco, 'importe': check.importe,
            'fecha_emision': check.fecha_emision, 'fecha_deposito': check.fecha_deposito,
            **changes_by_number.get(f'n{check.numero}', {}),
        }
        for check in payment.cheque_set.all()
    ]


# ── create_payment ────────────────────────────────────────────────────────────

class TestCreatePayment:
    def test_efectivo_no_crea_cheques_y_descuenta_la_cuenta_corriente(self, service):
        client = mock_client(cuenta_corriente=Decimal('10000.00'))

        payment = _create(service, client, amount=Decimal('3000.00'))

        assert payment.cheque_set.all() == []
        assert client.cuenta_corriente == Decimal('7000.00')

    def test_con_varios_cheques_crea_todos_en_cartera(self, service):
        client = mock_client(cuenta_corriente=Decimal('10000.00'))

        payment = _create(service, client, [_check(111, '1000.00'), _check(222, '2500.00', fecha_deposito='2024-02-15')])

        checks = payment.cheque_set.all()
        assert [check.numero for check in checks] == [111, 222]
        assert all(check.estado.descripcion == 'EN_CARTERA' and check.endosado is False for check in checks)
        assert checks[1].fecha_deposito == '2024-02-15'
        assert payment.importe == Decimal('3500.00')
        assert client.cuenta_corriente == Decimal('6500.00')

    def test_cheque_duplicado_no_crea_el_pago(self, service):
        client = mock_client(cuenta_corriente=Decimal('10000.00'))
        _create(service, client, [_check(111)])

        with pytest.raises(CheckAlreadyExistsException, match='N° 111'):
            _create(service, client, [_check(222), _check(111)])

        assert len(service.payment_repository._items) == 1
        assert client.cuenta_corriente == Decimal('9000.00')

    def test_mismo_cheque_de_otro_cliente_no_es_duplicado(self, service):
        _create(service, mock_client(), [_check(111)])

        payment = _create(service, mock_client(), [_check(111)])

        assert payment.cheque_set.all()[0].numero == 111

    def test_cheques_de_un_pago_anulado_se_pueden_volver_a_cargar(self, service):
        # Se cargó a Clöe un pago que en realidad hizo Kona: se anula, se carga a Kona y
        # después Clöe paga con cheques de los mismos números y bancos.
        cloe, kona = mock_client(razon_social='Clöe'), mock_client(razon_social='Kona')
        wrong = _create(service, cloe, [_check(111), _check(222), _check(333)])
        service.cancel_payment(wrong.id, 'Lo pagó Kona, no Clöe')

        _create(service, kona, [_check(111), _check(222), _check(333)])
        payment = _create(service, cloe, [_check(111), _check(222)])

        assert [check.numero for check in payment.cheque_set.all()] == [111, 222]

    def test_cheque_rechazado_del_cliente_sigue_siendo_duplicado(self, service, check_states):
        client = mock_client()
        payment = _create(service, client, [_check(111)])
        payment.cheque_set.all()[0].estado = check_states['RECHAZADO']

        with pytest.raises(CheckAlreadyExistsException):
            _create(service, client, [_check(111)])


# ── update_payment ────────────────────────────────────────────────────────────

class TestUpdateCheckPayment:
    def _update(self, service, payment, **data):
        return service.update_payment(payment.id, {
            'cliente': payment.cliente, 'tipo_pago': CHECK_TYPE, 'fecha_pago': '2024-01-01', **data,
        })

    def test_corrige_los_datos_de_un_cheque(self, service):
        payment = _create(service, mock_client(), [_check(111), _check(222)])
        entries = _edit_entries(payment, n222={'numero': 999, 'banco': OTHER_BANK, 'fecha_deposito': '2024-03-01'})

        self._update(service, payment, cheques=entries, observaciones='nota', fecha_pago='2024-01-05')

        first, second = payment.cheque_set.all()
        assert (first.numero, first.banco) == (111, BANK)
        assert (second.numero, second.banco, second.fecha_deposito) == (999, OTHER_BANK, '2024-03-01')
        assert payment.observaciones == 'nota'
        assert payment.fecha_pago == '2024-01-05'
        assert payment.importe == Decimal('2000.00')

    def test_cheque_endosado_bloquea_solo_sus_datos(self, service):
        payment = _create(service, mock_client(), [_check(111), _check(222)])
        endorsed = payment.cheque_set.all()[0]
        endorsed.endosado = True
        endorsed.pago_compra = mock_purchase_payment(proveedor=mock_supplier(nombre='Proveedor Test'))

        with pytest.raises(CheckEditBlockedException, match='N° 111.*Proveedor Test'):
            self._update(service, payment, cheques=_edit_entries(payment, n111={'fecha_deposito': '2024-03-01'}))

        self._update(service, payment, cheques=_edit_entries(payment, n222={'numero': 999}))
        assert payment.cheque_set.all()[1].numero == 999

    def test_corregir_a_un_numero_duplicado_lanza_excepcion(self, service):
        client = mock_client()
        _create(service, client, [_check(555)])
        payment = _create(service, client, [_check(111)])

        with pytest.raises(CheckAlreadyExistsException, match='N° 555'):
            self._update(service, payment, cheques=_edit_entries(payment, n111={'numero': 555}))

        assert payment.cheque_set.all()[0].numero == 111

    @pytest.mark.parametrize('change, message', [
        ({'tipo_pago': CASH_TYPE}, 'tipo de pago'),
        ({'cliente': mock_client()}, 'cliente'),
    ])
    def test_cambiar_tipo_o_cliente_pide_anular(self, service, change, message):
        payment = _create(service, mock_client(), [_check(111)])

        with pytest.raises(PaymentEditBlockedException, match=f'{message}.*anulá el pago'):
            self._update(service, payment, **change)

    def test_agregar_un_cheque_lo_crea_en_cartera_y_recalcula_el_pago(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00')])

        self._update(service, payment, cheques=[*_edit_entries(payment), _check(222, '500.00')])

        checks = payment.cheque_set.all()
        assert [check.numero for check in checks] == [111, 222]
        assert checks[1].estado.descripcion == 'EN_CARTERA'
        assert payment.importe == Decimal('1500.00')
        assert client.cuenta_corriente == Decimal('3500.00')

    def test_agregar_un_cheque_duplicado_no_cambia_nada(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        _create(service, client, [_check(555)])
        payment = _create(service, client, [_check(111)])

        with pytest.raises(CheckAlreadyExistsException, match='N° 555'):
            self._update(service, payment, cheques=[*_edit_entries(payment), _check(555)])

        assert [check.numero for check in payment.cheque_set.all()] == [111]
        assert client.cuenta_corriente == Decimal('3000.00')

    def test_quitar_un_cheque_en_cartera_lo_borra_y_devuelve_su_importe(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00'), _check(222, '2000.00')])
        removed = payment.cheque_set.all()[1]

        self._update(service, payment, cheques=_edit_entries(payment)[:1])

        assert [check.numero for check in payment.cheque_set.all()] == [111]
        assert service.check_repository.get_by_id(removed.id) is None
        assert payment.importe == Decimal('1000.00')
        assert client.cuenta_corriente == Decimal('4000.00')

    def test_quitar_y_agregar_a_la_vez(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00'), _check(222, '2000.00')])

        self._update(service, payment, cheques=[*_edit_entries(payment)[:1], _check(333, '500.00')])

        assert [check.numero for check in payment.cheque_set.all()] == [111, 333]
        assert payment.importe == Decimal('1500.00')
        assert client.cuenta_corriente == Decimal('3500.00')

    def test_quitar_un_cheque_que_no_esta_en_cartera_pide_anular(self, service):
        payment = _create(service, mock_client(), [_check(111), _check(222)])
        payment.cheque_set.all()[1].estado = mock_check_state(descripcion='DEPOSITADO')

        with pytest.raises(PaymentEditBlockedException, match='quitar el cheque N° 222: ya no está en cartera'):
            self._update(service, payment, cheques=_edit_entries(payment)[:1])

        assert len(payment.cheque_set.all()) == 2

    def test_quitar_un_cheque_endosado_lo_bloquea_por_el_endoso(self, service):
        payment = _create(service, mock_client(), [_check(111), _check(222)])
        endorsed = payment.cheque_set.all()[1]
        endorsed.endosado = True
        endorsed.pago_compra = mock_purchase_payment(proveedor=mock_supplier(nombre='Proveedor Test'))

        with pytest.raises(CheckEditBlockedException, match='No se puede quitar el cheque N° 222.*Proveedor Test'):
            self._update(service, payment, cheques=_edit_entries(payment)[:1])

    def test_quitar_un_cheque_usado_en_un_pago_a_proveedor_anulado_pide_anular(self, service):
        # Volvió a cartera, pero el pago a proveedor anulado lo conserva como registro.
        payment = _create(service, mock_client(), [_check(111), _check(222)])
        service.check_repository._recorded = {payment.cheque_set.all()[1].id: [120]}

        with pytest.raises(PaymentEditBlockedException, match='pago a proveedor N° 00000120'):
            self._update(service, payment, cheques=_edit_entries(payment)[:1])

        assert len(payment.cheque_set.all()) == 2

    def test_un_cheque_de_otro_pago_no_se_acepta(self, service):
        other = _create(service, mock_client(), [_check(999)])
        payment = _create(service, mock_client(), [_check(111)])

        with pytest.raises(PaymentEditBlockedException, match='no pertenece a este pago'):
            self._update(service, payment, cheques=[*_edit_entries(payment), *_edit_entries(other)])

    def test_cambiar_el_importe_de_un_cheque_en_cartera_recalcula_el_pago(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00'), _check(222, '2000.00')])

        self._update(service, payment, cheques=_edit_entries(payment, n111={'importe': Decimal('1500.00')}))

        assert payment.cheque_set.all()[0].importe == Decimal('1500.00')
        assert payment.importe == Decimal('3500.00')
        assert client.cuenta_corriente == Decimal('1500.00')

    def test_bajar_el_importe_de_un_cheque_devuelve_la_diferencia(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00')])

        self._update(service, payment, cheques=_edit_entries(payment, n111={'importe': Decimal('400.00')}))

        assert payment.importe == Decimal('400.00')
        assert client.cuenta_corriente == Decimal('4600.00')

    def test_cambiar_el_importe_de_un_cheque_que_no_esta_en_cartera_pide_anular(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00'), _check(222, '2000.00')])
        payment.cheque_set.all()[0].estado = mock_check_state(descripcion='DEPOSITADO')

        with pytest.raises(PaymentEditBlockedException, match='N° 111: ya no está en cartera.*anulá el pago'):
            self._update(service, payment, cheques=_edit_entries(
                payment, n111={'importe': Decimal('3000.00')}, n222={'importe': Decimal('2500.00')},
            ))

        assert payment.importe == Decimal('3000.00')
        assert client.cuenta_corriente == Decimal('2000.00')
        assert payment.cheque_set.all()[1].importe == Decimal('2000.00')

    @pytest.mark.parametrize('state', ['DEPOSITADO', 'ACREDITADO', 'RECHAZADO'])
    def test_corregir_los_datos_de_un_cheque_que_no_esta_en_cartera_pide_anular(self, service, state):
        payment = _create(service, mock_client(), [_check(111)])
        payment.cheque_set.all()[0].estado = mock_check_state(descripcion=state)

        with pytest.raises(PaymentEditBlockedException, match='modificar el cheque N° 111: ya no está en cartera'):
            self._update(service, payment, cheques=_edit_entries(payment, n111={'numero': 112}))

        assert payment.cheque_set.all()[0].numero == 111

    def test_un_cheque_que_no_esta_en_cartera_sin_cambios_no_bloquea_la_edicion(self, service):
        payment = _create(service, mock_client(), [_check(111)])
        payment.cheque_set.all()[0].estado = mock_check_state(descripcion='DEPOSITADO')

        self._update(service, payment, cheques=_edit_entries(payment), observaciones='Corregido')

        assert payment.observaciones == 'Corregido'

    def test_cambiar_el_importe_de_un_cheque_endosado_lo_bloquea_por_el_endoso(self, service):
        payment = _create(service, mock_client(), [_check(111)])
        endorsed = payment.cheque_set.all()[0]
        endorsed.endosado = True
        endorsed.pago_compra = mock_purchase_payment(proveedor=mock_supplier(nombre='Proveedor Test'))

        with pytest.raises(CheckEditBlockedException, match='endosado al proveedor Proveedor Test'):
            self._update(service, payment, cheques=_edit_entries(payment, n111={'importe': Decimal('3000.00')}))


class TestUpdatePaymentWithoutChecks:
    def _update(self, service, payment, **data):
        return service.update_payment(payment.id, {
            'cliente': payment.cliente, 'tipo_pago': CASH_TYPE, 'fecha_pago': '2024-01-01',
            'importe': payment.importe, **data,
        })

    def test_cambia_el_importe_y_ajusta_la_cuenta_corriente(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, amount=Decimal('1000.00'))

        self._update(service, payment, importe=Decimal('1500.00'))

        assert payment.importe == Decimal('1500.00')
        assert client.cuenta_corriente == Decimal('3500.00')

    def test_cambia_el_cliente_y_ajusta_las_dos_cuentas_corrientes(self, service):
        old_client = mock_client(cuenta_corriente=Decimal('3000.00'))
        new_client = mock_client(cuenta_corriente=Decimal('8000.00'))
        payment = _create(service, old_client, amount=Decimal('1000.00'))

        self._update(service, payment, cliente=new_client)

        assert old_client.cuenta_corriente == Decimal('3000.00')  # se le devuelve el pago
        assert new_client.cuenta_corriente == Decimal('7000.00')  # se le descuenta

    def test_pasar_a_cheque_crea_los_cheques_y_ajusta_la_diferencia(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, amount=Decimal('1000.00'))

        self._update(service, payment, tipo_pago=CHECK_TYPE, importe=Decimal('3000.00'),
                     cheques=[_check(111, '1000.00'), _check(222, '2000.00')])

        assert [check.numero for check in payment.cheque_set.all()] == [111, 222]
        assert client.cuenta_corriente == Decimal('2000.00')

    def test_pasar_a_cheque_con_un_cheque_duplicado_no_cambia_nada(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        _create(service, client, [_check(111)])
        payment = _create(service, client, amount=Decimal('1000.00'))

        with pytest.raises(CheckAlreadyExistsException):
            self._update(service, payment, tipo_pago=CHECK_TYPE, cheques=[_check(111)])

        assert payment.tipo_pago == CASH_TYPE
        assert client.cuenta_corriente == Decimal('3000.00')


class TestUpdateBlocked:
    def test_pago_anulado_no_se_edita(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, amount=Decimal('1000.00'))
        service.cancel_payment(payment.id, 'error de carga')

        with pytest.raises(PaymentEditBlockedException, match='anulado'):
            service.update_payment(payment.id, {'importe': Decimal('1500.00')})

        assert payment.importe == Decimal('1000.00')
        assert client.cuenta_corriente == Decimal('5000.00')

    def test_pago_inexistente(self, service):
        with pytest.raises(ClientPaymentNotFoundException):
            service.update_payment(9999, {'importe': Decimal('100.00')})


# ── cancel_payment ────────────────────────────────────────────────────────────

class TestCancelPayment:
    def test_anula_el_pago_con_fecha_y_motivo_sin_eliminarlo(self, service):
        payment = _create(service, mock_client(), amount=Decimal('1000.00'))

        result = service.cancel_payment(payment.id, 'Se cargó dos veces')

        assert result.estado_pago == 'ANULADO'
        assert result.fecha_anulacion is not None
        assert result.motivo_anulacion == 'Se cargó dos veces'
        assert service.payment_repository.get_by_id(payment.id) is payment

    def test_devuelve_el_importe_a_la_cuenta_corriente(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, amount=Decimal('2000.00'))

        service.cancel_payment(payment.id, 'error')

        assert client.cuenta_corriente == Decimal('5000.00')

    def test_todos_los_cheques_pasan_a_anulado_y_no_se_borran(self, service):
        payment = _create(service, mock_client(), [_check(111), _check(222)])

        service.cancel_payment(payment.id, 'error')

        assert [check.estado.descripcion for check in payment.cheque_set.all()] == ['ANULADO', 'ANULADO']
        assert len(service.check_repository._items) == 2

    def test_cheque_endosado_a_un_pago_vigente_bloquea(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111), _check(222)])
        endorsed = payment.cheque_set.all()[1]
        endorsed.endosado = True
        endorsed.pago_compra = mock_purchase_payment(proveedor=mock_supplier(nombre='Proveedor Test'))

        with pytest.raises(PaymentCancelBlockedException, match='N° 222.*Proveedor Test'):
            service.cancel_payment(payment.id, 'error')

        assert payment.estado_pago == 'VIGENTE'
        assert client.cuenta_corriente == Decimal('3000.00')
        assert payment.cheque_set.all()[0].estado.descripcion == 'EN_CARTERA'

    def test_con_un_cheque_rechazado_devuelve_solo_lo_que_queda_del_pago(self, service, check_states):
        # Al rechazar el 111 ya se devolvió su importe y el pago bajó a 2000.
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, [_check(111, '1000.00'), _check(222, '2000.00')])
        rejected = payment.cheque_set.all()[0]
        rejected.estado = check_states['RECHAZADO']
        payment.importe = Decimal('2000.00')
        client.cuenta_corriente = Decimal('3000.00')

        service.cancel_payment(payment.id, 'error')

        assert client.cuenta_corriente == Decimal('5000.00')
        assert [check.estado.descripcion for check in payment.cheque_set.all()] == ['RECHAZADO', 'ANULADO']

    def test_cheque_rechazado_y_endosado_no_bloquea(self, service, check_states):
        payment = _create(service, mock_client(), [_check(111), _check(222)])
        rejected = payment.cheque_set.all()[0]
        rejected.estado = check_states['RECHAZADO']
        rejected.endosado = True
        rejected.pago_compra = mock_purchase_payment()

        service.cancel_payment(payment.id, 'error')

        assert payment.estado_pago == 'ANULADO'

    def test_pago_ya_anulado(self, service):
        client = mock_client(cuenta_corriente=Decimal('5000.00'))
        payment = _create(service, client, amount=Decimal('1000.00'))
        service.cancel_payment(payment.id, 'error')

        with pytest.raises(PaymentCancelBlockedException, match='ya está anulado'):
            service.cancel_payment(payment.id, 'otra vez')

        assert client.cuenta_corriente == Decimal('5000.00')
        assert payment.motivo_anulacion == 'error'

    def test_pago_inexistente(self, service):
        with pytest.raises(ClientPaymentNotFoundException):
            service.cancel_payment(9999, 'error')


# ── apply_rejected_check ──────────────────────────────────────────────────────

class TestApplyRejectedCheck:
    def _payment(self, *checks):
        rejected = mock_check_state(descripcion='RECHAZADO')
        in_wallet = mock_check_state(descripcion='EN_CARTERA')
        mocks = [
            mock_check(numero=number, importe=Decimal(amount), estado=rejected if is_rejected else in_wallet)
            for number, amount, is_rejected in checks
        ]
        client = mock_client(cuenta_corriente=Decimal('0.00'))
        return mock_client_payment(cliente=client, cheques=mocks), client, mocks

    def test_rechazo_parcial_descuenta_el_cheque_del_pago(self):
        # Se rechaza el 111 (ya en RECHAZADO); queda el 222 en cartera.
        payment, client, (first, _) = self._payment((111, '1000.00', True), (222, '2000.00', False))
        payment.importe = Decimal('3000.00')

        apply_rejected_check(FakePaymentRepo(), FakeClientRepo(), first)

        assert client.cuenta_corriente == Decimal('1000.00')
        assert payment.importe == Decimal('2000.00')
        assert payment.estado_pago == 'VIGENTE'

    def test_rechazo_del_ultimo_cheque_anula_el_pago(self):
        # El 111 se rechazó antes (el pago bajó a 2000); ahora se rechaza el 222.
        payment, client, (_, second) = self._payment((111, '1000.00', True), (222, '2000.00', True))
        payment.importe = Decimal('2000.00')

        apply_rejected_check(FakePaymentRepo(), FakeClientRepo(), second)

        assert client.cuenta_corriente == Decimal('2000.00')
        assert payment.estado_pago == 'ANULADO'
        assert payment.fecha_anulacion is not None
        assert payment.motivo_anulacion == 'Cheques rechazados: N° 111, N° 222'
        assert payment.importe == Decimal('3000.00')

    def test_rechazo_del_unico_cheque_anula_el_pago(self):
        payment, client, (check,) = self._payment((111, '1500.00', True))
        payment.importe = Decimal('1500.00')

        apply_rejected_check(FakePaymentRepo(), FakeClientRepo(), check)

        assert client.cuenta_corriente == Decimal('1500.00')
        assert payment.estado_pago == 'ANULADO'
        assert payment.motivo_anulacion == 'Cheque rechazado: N° 111'
        assert payment.importe == Decimal('1500.00')
