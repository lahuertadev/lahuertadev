import pytest
from decimal import Decimal
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from mercado.models import Mercado
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad
from producto.models import Producto
from proveedor.models import Proveedor
from compra.models import Compra
from compra.views import BuyViewSet

BULK_URL = '/buy/bulk/'


# ── Fixtures DB ────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def db_setup(db):
    market, _ = Mercado.objects.get_or_create(descripcion='Central Test')
    category, _ = Categoria.objects.get_or_create(descripcion='Verdura Test')
    container_type, _ = TipoContenedor.objects.get_or_create(descripcion='Cajon Test')
    unit_type, _ = TipoUnidad.objects.get_or_create(descripcion='Kilo Test', defaults={'tipo_medicion': 'PESO'})

    def make_supplier(name, stall):
        return Proveedor.objects.create(
            nombre=name, puesto=stall, telefono='1122334455',
            nombre_fantasia=name, mercado=market, cuenta_corriente=Decimal('0'),
        )

    def make_product(description):
        return Producto.objects.create(
            descripcion=description, categoria=category,
            tipo_contenedor=container_type, tipo_unidad=unit_type,
        )

    return {
        'supplier_a': make_supplier('Proveedor A', 1),
        'supplier_b': make_supplier('Proveedor B', 2),
        'product_1': make_product('Tomate Test'),
        'product_2': make_product('Lechuga Test'),
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
