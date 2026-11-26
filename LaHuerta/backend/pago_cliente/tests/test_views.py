import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from pago_cliente.models import PagoCliente
from pago_cliente.views import ClientPaymentViewSet
from pago_cliente.interfaces import IClientPaymentRepository
from pago_cliente.exceptions import (
    ClientPaymentNotFoundException,
    PaymentCancelBlockedException,
    PaymentEditBlockedException,
    CheckEditBlockedException,
)
from core.tests.factories import make_bank, make_check, make_client, make_client_payment, make_payment_type


# ── Fixtures DB ────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def db_setup(db):
    tipo_pago = make_payment_type(descripcion='Efectivo')
    cliente = make_client(razon_social='Cliente Test SA', cuenta_corriente=Decimal('10000.00'))
    return {'cliente': cliente, 'tipo_pago': tipo_pago}


# ── Fake repo ──────────────────────────────────────────────────────────────────

class FakeClientPaymentRepo(IClientPaymentRepository):
    def __init__(self):
        self._items = {}
        self._next_id = 1

    def _add_real(self, cliente, tipo_pago, importe=Decimal('1000.00')):
        '''Usa objetos reales de Django para que el serializer los serialice correctamente.'''
        payment = make_client_payment(
            cliente=cliente,
            tipo_pago=tipo_pago,
            fecha_pago='2024-01-01',
            importe=importe,
        )
        self._items[payment.id] = payment
        return payment

    def get_all(self, client_id=None, business_name=None, amount_min=None, amount_max=None,
                date_from=None, date_to=None, payment_type_id=None, state=None):
        qs = PagoCliente.objects.select_related('cliente', 'tipo_pago').all()
        if client_id:
            qs = qs.filter(cliente_id=client_id)
        if business_name:
            qs = qs.filter(cliente__razon_social__icontains=business_name)
        if amount_min is not None:
            qs = qs.filter(importe__gte=amount_min)
        if amount_max is not None:
            qs = qs.filter(importe__lte=amount_max)
        if date_from:
            qs = qs.filter(fecha_pago__gte=date_from)
        if date_to:
            qs = qs.filter(fecha_pago__lte=date_to)
        if payment_type_id:
            qs = qs.filter(tipo_pago_id=payment_type_id)
        if state:
            qs = qs.filter(estado_pago=state)
        return qs

    def get_by_id(self, id):
        return PagoCliente.objects.select_related('cliente', 'tipo_pago').filter(id=id).first()

    def create(self, client, payment_type, payment_date, amount, observations=None):
        payment = PagoCliente.objects.create(
            cliente=client,
            tipo_pago=payment_type,
            fecha_pago=payment_date,
            importe=amount,
            observaciones=observations,
        )
        return payment

    def update(self, payment, data):
        for k, v in data.items():
            setattr(payment, k, v)
        payment.save()
        return payment

    def save(self, payment):
        payment.save()
        return payment


# ── Fake service ───────────────────────────────────────────────────────────────

class FakeClientPaymentService:
    def __init__(self, repo):
        self._repo = repo

    def create_payment(self, data):
        return self._repo.create(
            client=data['cliente'],
            payment_type=data['tipo_pago'],
            payment_date=data['fecha_pago'],
            amount=data['importe'],
            observations=data.get('observaciones'),
        )

    def update_payment(self, payment_id, data):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')
        return self._repo.update(payment, data)

    def cancel_payment(self, payment_id, reason):
        payment = self._repo.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')
        if payment.estado_pago == 'ANULADO':
            raise PaymentCancelBlockedException('El pago ya está anulado.')
        return self._repo.update(
            payment, {'estado_pago': 'ANULADO', 'fecha_anulacion': '2024-02-01', 'motivo_anulacion': reason},
        )


def _make_viewset():
    repo = FakeClientPaymentRepo()
    svc = FakeClientPaymentService(repo)
    return ClientPaymentViewSet(repository=repo, service=svc), repo


# ── LIST ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_empty(factory):
    vs, _ = _make_viewset()
    request = factory.get('/client-payment/')
    response = vs.list(Request(request, parsers=[JSONParser()]))
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_list_with_items(factory, db_setup):
    vs, repo = _make_viewset()
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])

    response = vs.list(Request(factory.get('/client-payment/'), parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 2


@pytest.mark.django_db
def test_list_filter_by_client_id(factory, db_setup):
    otro_cliente = make_client(
        cuit='27987654321',
        razon_social='Otro SRL',
        cuenta_corriente=Decimal('0.00'),
        localidad=db_setup['cliente'].localidad,
        condicion_IVA=db_setup['cliente'].condicion_IVA,
    )
    vs, repo = _make_viewset()
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    repo._add_real(otro_cliente, db_setup['tipo_pago'])

    request = factory.get('/client-payment/', {'client_id': db_setup['cliente'].id})
    response = vs.list(Request(request, parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['cliente']['id'] == db_setup['cliente'].id


@pytest.mark.django_db
def test_list_filter_by_payment_type_id(factory, db_setup):
    otro_tipo = make_payment_type(descripcion='Transferencia')
    vs, repo = _make_viewset()
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    payment_transferencia = repo._add_real(db_setup['cliente'], otro_tipo)

    request = factory.get('/client-payment/', {'payment_type_id': otro_tipo.id})
    response = vs.list(Request(request, parsers=[JSONParser()]))

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['id'] == payment_transferencia.id


@pytest.mark.django_db
def test_list_filter_by_state(factory, db_setup):
    vs, repo = _make_viewset()
    repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    cancelled = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    repo.update(cancelled, {'estado_pago': 'ANULADO'})

    request = factory.get('/client-payment/', {'state': 'ANULADO'})
    response = vs.list(Request(request, parsers=[JSONParser()]))

    assert response.status_code == 200
    assert [item['id'] for item in response.data] == [cancelled.id]
    assert response.data[0]['estado_pago'] == 'ANULADO'


@pytest.mark.django_db
def test_list_filter_by_invalid_state_returns_400(factory):
    from rest_framework.exceptions import ValidationError
    vs, _ = _make_viewset()

    with pytest.raises(ValidationError):
        vs.list(Request(factory.get('/client-payment/', {'state': 'OTRO'}), parsers=[JSONParser()]))


# ── RETRIEVE ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_not_found(factory):
    vs, _ = _make_viewset()
    response = vs.retrieve(Request(factory.get('/client-payment/999/'), parsers=[JSONParser()]), pk=999)
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_retrieve_success(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])

    response = vs.retrieve(
        Request(factory.get(f'/client-payment/{payment.id}/'), parsers=[JSONParser()]),
        pk=payment.id,
    )

    assert response.status_code == 200
    assert response.data['id'] == payment.id
    assert response.data['cheques'] == []
    assert response.data['estado_pago'] == 'VIGENTE'
    assert response.data['fecha_anulacion'] is None
    assert response.data['motivo_anulacion'] is None


@pytest.mark.django_db
def test_retrieve_devuelve_todos_los_cheques_del_pago(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    first = make_check(pago_cliente=payment, importe=Decimal('400.00'))
    second = make_check(pago_cliente=payment, importe=Decimal('600.00'))

    response = vs.retrieve(
        Request(factory.get(f'/client-payment/{payment.id}/'), parsers=[JSONParser()]),
        pk=payment.id,
    )

    assert [check['id'] for check in response.data['cheques']] == [first.id, second.id]
    assert response.data['cheques'][0]['numero'] == first.numero
    assert response.data['cheques'][1]['importe'] == '600.00'


# ── CREATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_success(factory, db_setup):
    vs, _ = _make_viewset()
    payload = {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
        'importe': '1500.00',
    }
    response = vs.create(Request(factory.post('/client-payment/', payload, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 201
    assert response.data['id'] is not None


@pytest.mark.django_db
def test_create_missing_required_fields(factory):
    vs, _ = _make_viewset()
    response = vs.create(Request(factory.post('/client-payment/', {}, format='json'), parsers=[JSONParser()]))
    assert response.status_code == 400
    assert 'cliente' in response.data


def _create_request(factory, payload):
    return Request(factory.post('/client-payment/', payload, format='json'), parsers=[JSONParser()])


def _check_payload(numero, bank, importe='1000.00'):
    return {'numero': numero, 'banco': bank.id, 'importe': importe, 'fecha_emision': '2024-01-10'}


@pytest.mark.django_db
def test_create_con_cheques_el_importe_es_la_suma(factory, db_setup):
    captured = {}

    class CapturingService:
        def create_payment(self, data):
            captured.update(data)
            return make_client_payment(cliente=data['cliente'], tipo_pago=data['tipo_pago'], importe=data['importe'])

    bank = make_bank()
    vs = ClientPaymentViewSet(repository=FakeClientPaymentRepo(), service=CapturingService())
    response = vs.create(_create_request(factory, {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': make_payment_type(descripcion='Cheque').id,
        'fecha_pago': '2024-01-15',
        'importe': '1.00',
        'cheques': [_check_payload(111, bank, '1000.00'), _check_payload(222, bank, '2500.00')],
    }))

    assert response.status_code == 201
    assert captured['importe'] == Decimal('3500.00')
    assert [check['numero'] for check in captured['cheques']] == [111, 222]


@pytest.mark.django_db
def test_create_con_cheque_sin_cheques_devuelve_400(factory, db_setup):
    vs, _ = _make_viewset()
    response = vs.create(_create_request(factory, {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': make_payment_type(descripcion='Cheque').id,
        'fecha_pago': '2024-01-15',
        'cheques': [],
    }))

    assert response.status_code == 400
    assert 'cheques' in response.data


@pytest.mark.django_db
def test_create_con_el_mismo_cheque_dos_veces_devuelve_400(factory, db_setup):
    bank = make_bank()
    vs, _ = _make_viewset()
    response = vs.create(_create_request(factory, {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': make_payment_type(descripcion='Cheque').id,
        'fecha_pago': '2024-01-15',
        'cheques': [_check_payload(111, bank), _check_payload(111, bank)],
    }))

    assert response.status_code == 400
    assert 'dos veces' in str(response.data['cheques'])


@pytest.mark.django_db
def test_create_en_efectivo_con_cheques_devuelve_400(factory, db_setup):
    vs, _ = _make_viewset()
    response = vs.create(_create_request(factory, {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
        'importe': '1000.00',
        'cheques': [_check_payload(111, make_bank())],
    }))

    assert response.status_code == 400
    assert 'no lleva cheques' in str(response.data['cheques'])


@pytest.mark.django_db
def test_create_en_efectivo_sin_importe_devuelve_400(factory, db_setup):
    vs, _ = _make_viewset()
    response = vs.create(_create_request(factory, {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
    }))

    assert response.status_code == 400
    assert 'importe' in response.data


# ── UPDATE ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_not_found(factory, db_setup):
    vs, _ = _make_viewset()
    payload = {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': db_setup['tipo_pago'].id,
        'fecha_pago': '2024-01-15',
        'importe': '1000.00',
    }
    response = vs.update(
        Request(factory.put('/client-payment/999/', payload, format='json'), parsers=[JSONParser()]),
        pk=999,
    )
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_update_bloquea_si_cheque_endosado(factory, db_setup):
    class ServiceQueBloquea:
        def update_payment(self, payment_id, data):
            raise CheckEditBlockedException('No se pueden modificar los datos del cheque N° 1: ya fue endosado.')

    repo = FakeClientPaymentRepo()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    vs = ClientPaymentViewSet(repository=repo, service=ServiceQueBloquea())

    tipo_efectivo = make_payment_type(descripcion='Transferencia')
    payload = {
        'cliente': db_setup['cliente'].id,
        'tipo_pago': tipo_efectivo.id,
        'fecha_pago': '2024-01-15',
        'importe': '1000.00',
    }
    response = vs.update(
        Request(factory.put(f'/client-payment/{payment.id}/', payload, format='json'), parsers=[JSONParser()]),
        pk=payment.id,
    )
    assert response.status_code == 400
    assert 'endosado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_update_pago_anulado_devuelve_400(factory, db_setup):
    class ServiceQueBloquea:
        def update_payment(self, payment_id, data):
            raise PaymentEditBlockedException('No se puede editar un pago anulado.')

    repo = FakeClientPaymentRepo()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    vs = ClientPaymentViewSet(repository=repo, service=ServiceQueBloquea())

    response = vs.partial_update(
        Request(factory.patch(f'/client-payment/{payment.id}/', {'importe': '50.00'}, format='json'),
                parsers=[JSONParser()]),
        pk=payment.id,
    )
    assert response.status_code == 400
    assert 'anulado' in response.data['detail']


# ── CANCEL ─────────────────────────────────────────────────────────────────────

def _cancel(vs, factory, pk, reason='Se cargó dos veces'):
    payload = {'motivo': reason} if reason is not None else {}
    return vs.cancel(
        Request(factory.post(f'/client-payment/{pk}/cancel/', payload, format='json'), parsers=[JSONParser()]),
        pk=pk,
    )


@pytest.mark.django_db
def test_cancel_not_found(factory):
    vs, _ = _make_viewset()
    response = _cancel(vs, factory, 999)
    assert response.status_code == 404
    assert 'no encontrado' in response.data['detail'].lower()


@pytest.mark.django_db
def test_cancel_success_devuelve_el_pago_anulado(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])

    response = _cancel(vs, factory, payment.id)

    assert response.status_code == 200
    assert response.data['id'] == payment.id
    assert response.data['estado_pago'] == 'ANULADO'
    assert response.data['fecha_anulacion'] == '2024-02-01'
    assert response.data['motivo_anulacion'] == 'Se cargó dos veces'
    # el pago no se elimina
    assert PagoCliente.objects.filter(id=payment.id).exists()


@pytest.mark.django_db
@pytest.mark.parametrize('reason', [None, '', 'x' * 201])
def test_cancel_sin_motivo_valido_devuelve_400(factory, db_setup, reason):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])

    response = _cancel(vs, factory, payment.id, reason=reason)

    assert response.status_code == 400
    assert 'motivo' in response.data
    payment.refresh_from_db()
    assert payment.estado_pago == 'VIGENTE'


@pytest.mark.django_db
def test_cancel_bloqueado_devuelve_400(factory, db_setup):
    vs, repo = _make_viewset()
    payment = repo._add_real(db_setup['cliente'], db_setup['tipo_pago'])
    _cancel(vs, factory, payment.id)

    response = _cancel(vs, factory, payment.id)

    assert response.status_code == 400
    assert 'ya está anulado' in response.data['detail']


@pytest.mark.django_db
def test_cancel_error_inesperado_devuelve_500(factory):
    service = Mock()
    service.cancel_payment.side_effect = RuntimeError('boom')
    vs = ClientPaymentViewSet(repository=FakeClientPaymentRepo(), service=service)

    response = _cancel(vs, factory, 1)

    assert response.status_code == 500
    assert response.data['detail'] == 'Error al anular el pago.'


def test_delete_ya_no_esta_disponible():
    assert not hasattr(ClientPaymentViewSet, 'destroy')
