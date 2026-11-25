import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from compra.models import Compra
from compra.views import BuyViewSet
from core.tests.factories import (
    make_check, make_check_state, make_client_check_use, make_own_check, make_payment_type, make_product, make_purchase, make_purchase_application, make_purchase_payment, make_supplier,
)

BULK_URL = '/buy/bulk/'


# ── Fixtures DB ────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def db_setup(db):
    return {
        'supplier_a': make_supplier(nombre='Proveedor A'),
        'supplier_b': make_supplier(nombre='Proveedor B'),
        'product_1': make_product(descripcion='Tomate Test'),
        'product_2': make_product(descripcion='Lechuga Test'),
    }


def _item(product, box_price='1000.00'):
    return {
        'producto': product.id,
        'cantidad_producto': 1,
        'precio_bulto': box_price,
        'precio_unitario': box_price,
    }


def _post_bulk(factory, data):
    view = BuyViewSet.as_view({'post': 'bulk_create'})
    request = factory.post(BULK_URL, data, format='json')
    force_authenticate(request, user=Mock(is_authenticated=True))
    return view(request)


# ── Tests: bulk_create ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBuyBulkCreate:

    def test_todas_validas_crea_una_compra_por_proveedor(self, factory, db_setup):
        response = _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'], '1000.00')]},
                {'proveedor': db_setup['supplier_b'].id, 'items': [_item(db_setup['product_1'], '500.00'), _item(db_setup['product_2'], '200.00')]},
            ],
        })

        assert response.status_code == 201
        assert response.data['errores'] == []
        assert [created['index'] for created in response.data['creadas']] == [0, 1]
        assert Compra.objects.filter(fecha='2024-05-10').count() == 2

        buy_b = Compra.objects.get(proveedor=db_setup['supplier_b'])
        assert buy_b.importe == Decimal('700.00')

    def test_todas_las_compras_usan_la_fecha_de_la_carga(self, factory, db_setup):
        _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'fecha': '2020-01-01', 'items': [_item(db_setup['product_1'])]},
            ],
        })

        assert Compra.objects.get(proveedor=db_setup['supplier_a']).fecha.isoformat() == '2024-05-10'

    def test_actualiza_cc_de_cada_proveedor(self, factory, db_setup):
        _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'senia': '100.00', 'items': [_item(db_setup['product_1'], '1000.00')]},
                {'proveedor': db_setup['supplier_b'].id, 'items': [_item(db_setup['product_1'], '500.00')]},
            ],
        })

        db_setup['supplier_a'].refresh_from_db()
        db_setup['supplier_b'].refresh_from_db()
        assert db_setup['supplier_a'].cuenta_corriente == Decimal('900.00')
        assert db_setup['supplier_b'].cuenta_corriente == Decimal('500.00')

    def test_una_invalida_guarda_las_validas_y_responde_207(self, factory, db_setup):
        response = _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'])]},
                {'proveedor': db_setup['supplier_b'].id, 'items': []},
            ],
        })

        assert response.status_code == 207
        assert [created['index'] for created in response.data['creadas']] == [0]
        assert [error['index'] for error in response.data['errores']] == [1]
        assert 'items' in response.data['errores'][0]['errores']
        assert Compra.objects.count() == 1

    def test_todas_invalidas_responde_400_sin_guardar(self, factory, db_setup):
        response = _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'items': []},
                {'proveedor': 99999, 'items': [_item(db_setup['product_1'])]},
            ],
        })

        assert response.status_code == 400
        assert response.data['creadas'] == []
        assert [error['index'] for error in response.data['errores']] == [0, 1]
        assert Compra.objects.count() == 0

    def test_error_al_guardar_se_informa_por_compra_sin_exponer_la_excepcion(self, factory, db_setup):
        service = Mock()
        service.create_bulk_buys.return_value = ([], [(0, Exception('Duplicate entry for key PRIMARY'))])
        viewset = BuyViewSet(service=service)
        payload = {
            'fecha': '2024-05-10',
            'compras': [{'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'])]}],
        }

        response = viewset.bulk_create(
            Request(factory.post(BULK_URL, payload, format='json'), parsers=[JSONParser()])
        )

        assert response.status_code == 400
        assert response.data['errores'] == [{'index': 0, 'errores': {'detail': 'Error al guardar la compra.'}}]

    def test_error_inesperado_responde_500(self, factory, db_setup):
        service = Mock()
        service.create_bulk_buys.side_effect = Exception('boom')
        viewset = BuyViewSet(service=service)
        payload = {
            'fecha': '2024-05-10',
            'compras': [{'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'])]}],
        }

        response = viewset.bulk_create(
            Request(factory.post(BULK_URL, payload, format='json'), parsers=[JSONParser()])
        )

        assert response.status_code == 500
        assert response.data['detail'] == 'Error al registrar la carga masiva de compras.'

    def test_proveedor_repetido_rechaza_la_carga(self, factory, db_setup):
        response = _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'])]},
                {'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_2'])]},
            ],
        })

        assert response.status_code == 400
        assert 'compras' in response.data
        assert Compra.objects.count() == 0

    def test_mismo_producto_en_distintos_proveedores_es_valido(self, factory, db_setup):
        response = _post_bulk(factory, {
            'fecha': '2024-05-10',
            'compras': [
                {'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'])]},
                {'proveedor': db_setup['supplier_b'].id, 'items': [_item(db_setup['product_1'])]},
            ],
        })

        assert response.status_code == 201

    def test_sin_compras_responde_400(self, factory, db_setup):
        response = _post_bulk(factory, {'fecha': '2024-05-10', 'compras': []})

        assert response.status_code == 400
        assert 'compras' in response.data

    def test_sin_fecha_responde_400(self, factory, db_setup):
        response = _post_bulk(factory, {
            'compras': [{'proveedor': db_setup['supplier_a'].id, 'items': [_item(db_setup['product_1'])]}],
        })

        assert response.status_code == 400
        assert 'fecha' in response.data


# ── Tests: create ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBuyCreate:

    def test_error_inesperado_responde_500_sin_exponer_la_excepcion(self, factory, db_setup):
        service = Mock()
        service.create_buy.side_effect = Exception('Duplicate entry for key PRIMARY')
        viewset = BuyViewSet(service=service)
        payload = {
            'proveedor': db_setup['supplier_a'].id,
            'fecha': '2024-05-10',
            'items': [_item(db_setup['product_1'])],
        }

        response = viewset.create(
            Request(factory.post('/buy/', payload, format='json'), parsers=[JSONParser()])
        )

        assert response.status_code == 500
        assert response.data['detail'] == 'Error al crear la compra.'


# ── Tests: update con pagos (DEV-141) ──────────────────────────────────────────

@pytest.mark.django_db
class TestBuyUpdateSupplierChange:

    MESSAGE = (
        'No se puede cambiar el proveedor: la compra ya tiene pagos registrados. '
        'Eliminá esos pagos primero.'
    )

    @pytest.mark.parametrize('method, action', [('put', 'update'), ('patch', 'partial_update')])
    def test_cambio_de_proveedor_con_pagos_responde_400(self, factory, db_setup, method, action):
        from compra.exceptions import BuySupplierChangeBlockedException
        service = Mock()
        service.update_buy.side_effect = BuySupplierChangeBlockedException(self.MESSAGE)
        viewset = BuyViewSet(service=service)
        request = getattr(factory, method)('/buy/1/', {'proveedor': db_setup['supplier_b'].id}, format='json')

        response = getattr(viewset, action)(Request(request, parsers=[JSONParser()]), pk=1)

        assert response.status_code == 400
        assert response.data['detail'] == self.MESSAGE


# ── Tests: retrieve ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_retrieve_expone_los_pagos_de_la_compra_con_lo_aplicado(factory):
    supplier = make_supplier()
    buy = make_purchase(importe=Decimal('2000.00'), proveedor=supplier)
    cash = make_payment_type(descripcion='Efectivo')
    first = make_purchase_payment(compra=buy, importe_abonado=Decimal('500.00'), tipo_pago=cash, fecha_pago='2026-10-01')
    # Un pago de varias compras: a esta solo le aplica una parte.
    second = make_purchase_payment(
        proveedor=supplier, compra=None, importe_abonado=Decimal('3000.00'), tipo_pago=cash, fecha_pago='2026-10-05',
    )
    make_purchase_application(pago_compra=second, compra=buy, importe=Decimal('700.00'))
    make_purchase_application(pago_compra=second, compra=make_purchase(proveedor=supplier), importe=Decimal('2300.00'))

    response = BuyViewSet().retrieve(Request(factory.get(f'/buy/{buy.id}/'), parsers=[JSONParser()]), pk=buy.id)

    assert response.status_code == 200
    assert [(p['id'], p['importe_abonado'], p['importe_aplicado'], p['tipo_pago']) for p in response.data['payments']] == [
        (first.id, Decimal('500.00'), Decimal('500.00'), 'Efectivo'),
        (second.id, Decimal('3000.00'), Decimal('700.00'), 'Efectivo'),
    ]
    assert response.data['outstanding_balance'] == Decimal('800.00')
    assert response.data['payment_status'] == 'PARCIAL'


def _retrieve_payments(factory, buy):
    response = BuyViewSet().retrieve(Request(factory.get(f'/buy/{buy.id}/'), parsers=[JSONParser()]), pk=buy.id)
    return response.data['payments']


@pytest.mark.django_db
def test_retrieve_pago_sin_cheques_caidos_no_tiene_fallen_check(factory):
    buy = make_purchase()
    make_purchase_payment(compra=buy)

    assert _retrieve_payments(factory, buy)[0]['fallen_check'] is None


@pytest.mark.django_db
def test_retrieve_pago_con_cheque_de_cliente_rechazado(factory):
    buy = make_purchase()
    payment = make_purchase_payment(compra=buy)
    make_client_check_use(pago_compra=payment, cheque=make_check(estado=make_check_state(descripcion='RECHAZADO')))

    assert _retrieve_payments(factory, buy)[0]['fallen_check'] == 'RECHAZADO'


@pytest.mark.django_db
def test_retrieve_pago_con_cheque_de_cliente_en_cartera_no_tiene_fallen_check(factory):
    buy = make_purchase()
    payment = make_purchase_payment(compra=buy)
    make_client_check_use(pago_compra=payment, cheque=make_check(estado=make_check_state(descripcion='ENDOSADO')))

    assert _retrieve_payments(factory, buy)[0]['fallen_check'] is None


@pytest.mark.django_db
@pytest.mark.parametrize('own_check_state', ['RECHAZADO', 'ANULADO'])
def test_retrieve_pago_con_cheque_propio_caido(factory, own_check_state):
    buy = make_purchase()
    make_purchase_payment(compra=buy, cheque_propio=make_own_check(estado=own_check_state))

    assert _retrieve_payments(factory, buy)[0]['fallen_check'] == own_check_state


@pytest.mark.django_db
def test_retrieve_compra_sin_pagos_tiene_lista_vacia(factory):
    buy = make_purchase()

    response = BuyViewSet().retrieve(Request(factory.get(f'/buy/{buy.id}/'), parsers=[JSONParser()]), pk=buy.id)

    assert response.data['payments'] == []
    assert response.data['payment_status'] == 'PENDIENTE'


@pytest.mark.django_db
def test_list_no_expone_los_pagos(factory):
    make_purchase()

    response = BuyViewSet().list(Request(factory.get('/buy/'), parsers=[JSONParser()]))

    assert 'payments' not in response.data[0]


@pytest.mark.django_db
def test_list_filtra_por_proveedor_puesto_o_nombre(factory):
    salvita = make_supplier(nombre='Salvita')
    buy = make_purchase(proveedor=salvita)
    make_purchase()

    response = BuyViewSet().list(Request(factory.get('/buy/', {'supplier': 'Salvita'}), parsers=[JSONParser()]))

    assert response.status_code == 200
    assert [item['id'] for item in response.data] == [buy.id]


@pytest.mark.django_db
def test_list_filtra_por_estado_de_pago(factory):
    unpaid = make_purchase(importe=Decimal('1000.00'))
    paid = make_purchase(importe=Decimal('1000.00'))
    make_purchase_payment(compra=paid, importe_abonado=Decimal('1000.00'))

    unpaid_response = BuyViewSet().list(Request(factory.get('/buy/', {'payment_status': 'por_pagar'}), parsers=[JSONParser()]))
    paid_response = BuyViewSet().list(Request(factory.get('/buy/', {'payment_status': 'abonadas'}), parsers=[JSONParser()]))

    assert [item['id'] for item in unpaid_response.data] == [unpaid.id]
    assert [item['id'] for item in paid_response.data] == [paid.id]


@pytest.mark.django_db
def test_list_estado_de_pago_invalido_se_rechaza(factory):
    from rest_framework.exceptions import ValidationError
    with pytest.raises(ValidationError):
        BuyViewSet().list(Request(factory.get('/buy/', {'payment_status': 'otro'}), parsers=[JSONParser()]))


@pytest.mark.django_db
def test_destroy_compra_con_pago_devuelve_400_y_no_la_elimina(factory):
    buy = make_purchase()
    payment = make_purchase_payment(compra=buy, importe_abonado=Decimal('100.00'))

    response = BuyViewSet().destroy(Request(factory.delete(f'/buy/{buy.id}/'), parsers=[JSONParser()]), pk=buy.id)

    assert response.status_code == 400
    assert f'N° {payment.id:08d}' in response.data['detail']
    buy.refresh_from_db()
