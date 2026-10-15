import pytest
from decimal import Decimal
from unittest.mock import Mock, patch

from rest_framework.test import APIRequestFactory, force_authenticate

from mercado.models import Mercado
from proveedor.models import Proveedor
from tipo_contenedor.models import TipoContenedor
from movimiento_vacio.models import MovimientoVacio
from movimiento_vacio.views import EmptyMovementViewSet

URL = '/empty-movement/'


# ── Fixtures DB ────────────────────────────────────────────────────────────────

@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def db_setup(db):
    market, _ = Mercado.objects.get_or_create(descripcion='Central Test')

    def make_supplier(name, stall):
        return Proveedor.objects.create(
            nombre=name, puesto=stall, telefono='1122334455',
            nombre_fantasia=name, mercado=market, cuenta_corriente=Decimal('0'),
        )

    return {
        'supplier_a': make_supplier('Proveedor A', 1),
        'supplier_b': make_supplier('Proveedor B', 2),
        'crate': TipoContenedor.objects.create(descripcion='Cajon Test', abreviacion='c', requiere_vacio=True),
        'cage': TipoContenedor.objects.create(descripcion='Jaula Test', abreviacion='j', requiere_vacio=True),
        'no_empty': TipoContenedor.objects.create(descripcion='Bolsa Test', abreviacion='b', requiere_vacio=False),
    }


def _line(container_type, quantity=18, price='4000.00'):
    return {'tipo_contenedor': container_type.id, 'cantidad': quantity, 'precio_unitario': price}


def _payload(supplier, movement_type='DEVOLUCION', lines=None, **extra):
    return {
        'proveedor': supplier.id,
        'fecha': '2026-07-14',
        'tipo': movement_type,
        'contenedores': lines,
        **extra,
    }


def _call(factory, method, action, data=None, pk=None):
    view = EmptyMovementViewSet.as_view({method: action})
    url = f'{URL}{pk}/' if pk else URL
    request = getattr(factory, method)(url, data, format='json')
    force_authenticate(request, user=Mock(is_authenticated=True))
    return view(request, pk=pk) if pk else view(request)


def _create(factory, data):
    return _call(factory, 'post', 'create', data)


# ── Tests: create ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreate:

    def test_devolucion_valida_responde_201_y_resta_de_la_cc(self, factory, db_setup):
        supplier = db_setup['supplier_a']

        response = _create(factory, _payload(
            supplier, 'DEVOLUCION', [_line(db_setup['crate'], 18, '4000.00')], nro_comprobante='264768',
        ))

        assert response.status_code == 201
        assert Decimal(response.data['importe']) == Decimal('72000.00')
        assert response.data['nro_comprobante'] == '264768'
        assert Decimal(str(response.data['contenedores'][0]['subtotal'])) == Decimal('72000.00')
        supplier.refresh_from_db()
        assert supplier.cuenta_corriente == Decimal('-72000.00')

    def test_carga_valida_suma_a_la_cc(self, factory, db_setup):
        supplier = db_setup['supplier_a']

        response = _create(factory, _payload(supplier, 'CARGA', [
            _line(db_setup['crate'], 10, '4000.00'),
            _line(db_setup['cage'], 5, '2000.00'),
        ]))

        assert response.status_code == 201
        supplier.refresh_from_db()
        assert supplier.cuenta_corriente == Decimal('50000.00')

    def test_nro_comprobante_vacio_se_guarda_como_null(self, factory, db_setup):
        response = _create(factory, _payload(
            db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'])], nro_comprobante='',
        ))

        assert response.status_code == 201
        assert response.data['nro_comprobante'] is None

    def test_sin_renglones_responde_400(self, factory, db_setup):
        response = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', []))

        assert response.status_code == 400
        assert 'contenedores' in response.data

    def test_tipo_de_contenedor_repetido_responde_400(self, factory, db_setup):
        response = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [
            _line(db_setup['crate'], 10), _line(db_setup['crate'], 8),
        ]))

        assert response.status_code == 400
        assert 'contenedores' in response.data

    def test_contenedor_que_no_requiere_vacio_responde_400(self, factory, db_setup):
        response = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [_line(db_setup['no_empty'])]))

        assert response.status_code == 400

    def test_cantidad_cero_responde_400(self, factory, db_setup):
        response = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'], 0)]))

        assert response.status_code == 400

    def test_tipo_invalido_responde_400(self, factory, db_setup):
        response = _create(factory, _payload(db_setup['supplier_a'], 'OTRO', [_line(db_setup['crate'])]))

        assert response.status_code == 400
        assert 'tipo' in response.data

    def test_campos_obligatorios_faltantes_responde_400(self, factory, db_setup):
        response = _create(factory, {})

        assert response.status_code == 400
        for field in ('proveedor', 'fecha', 'tipo', 'contenedores'):
            assert field in response.data

    def test_error_inesperado_responde_500_sin_exponer_la_excepcion(self, factory, db_setup):
        with patch('movimiento_vacio.service.EmptyMovementService.create_movement', side_effect=Exception('boom')):
            response = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'])]))

        assert response.status_code == 500
        assert 'boom' not in str(response.data)


# ── Tests: list / retrieve ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestListRetrieve:

    def test_list_filtra_por_nombre_de_proveedor_tipo_e_importe(self, factory, db_setup):
        _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'])]))
        _create(factory, _payload(db_setup['supplier_a'], 'DEVOLUCION', [_line(db_setup['crate'])]))
        _create(factory, _payload(db_setup['supplier_b'], 'DEVOLUCION', [_line(db_setup['crate'])]))

        view = EmptyMovementViewSet.as_view({'get': 'list'})
        request = factory.get(URL, {'proveedor': 'proveedor a', 'tipo': 'DEVOLUCION', 'importe': '72000'})
        force_authenticate(request, user=Mock(is_authenticated=True))
        response = view(request)

        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['tipo'] == 'DEVOLUCION'
        assert response.data[0]['proveedor']['id'] == db_setup['supplier_a'].id

    def test_list_importe_invalido_responde_400(self, factory, db_setup):
        view = EmptyMovementViewSet.as_view({'get': 'list'})
        request = factory.get(URL, {'importe': 'abc'})
        force_authenticate(request, user=Mock(is_authenticated=True))
        response = view(request)

        assert response.status_code == 400
        assert 'importe' in response.data

    def test_retrieve_existente_devuelve_renglones(self, factory, db_setup):
        created = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'])]))

        response = _call(factory, 'get', 'retrieve', pk=created.data['id'])

        assert response.status_code == 200
        assert len(response.data['contenedores']) == 1
        assert response.data['contenedores'][0]['tipo_contenedor']['id'] == db_setup['crate'].id

    def test_retrieve_inexistente_responde_404(self, factory, db_setup):
        response = _call(factory, 'get', 'retrieve', pk=9999)

        assert response.status_code == 404


# ── Tests: update ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUpdate:

    def test_put_reemplaza_el_movimiento_completo_y_ajusta_cc(self, factory, db_setup):
        supplier_a = db_setup['supplier_a']
        supplier_b = db_setup['supplier_b']
        created = _create(factory, _payload(
            supplier_a, 'CARGA', [_line(db_setup['crate'], 10, '1000.00')], nro_comprobante='111',
        ))

        response = _call(factory, 'put', 'update', _payload(
            supplier_b, 'DEVOLUCION', [_line(db_setup['cage'], 5, '2000.00')],
        ), pk=created.data['id'])

        assert response.status_code == 200
        assert response.data['tipo'] == 'DEVOLUCION'
        assert response.data['proveedor']['id'] == supplier_b.id
        assert len(response.data['contenedores']) == 1
        assert response.data['contenedores'][0]['tipo_contenedor']['id'] == db_setup['cage'].id
        # PUT reemplaza todo: el comprobante que no se envía queda vacío.
        assert response.data['nro_comprobante'] is None
        supplier_a.refresh_from_db()
        supplier_b.refresh_from_db()
        assert supplier_a.cuenta_corriente == Decimal('0')
        assert supplier_b.cuenta_corriente == Decimal('-10000.00')

    def test_put_sin_todos_los_campos_responde_400(self, factory, db_setup):
        created = _create(factory, _payload(db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'])]))

        response = _call(factory, 'put', 'update', {'fecha': '2026-07-15'}, pk=created.data['id'])

        assert response.status_code == 400
        for field in ('proveedor', 'tipo', 'contenedores'):
            assert field in response.data

    def test_put_inexistente_responde_404(self, factory, db_setup):
        response = _call(factory, 'put', 'update', _payload(
            db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'])],
        ), pk=9999)

        assert response.status_code == 404

    def test_patch_solo_modifica_lo_enviado(self, factory, db_setup):
        created = _create(factory, _payload(
            db_setup['supplier_a'], 'CARGA', [_line(db_setup['crate'], 10, '1000.00')], nro_comprobante='111',
        ))

        response = _call(factory, 'patch', 'partial_update', {'fecha': '2026-07-20'}, pk=created.data['id'])

        assert response.status_code == 200
        assert response.data['fecha'] == '2026-07-20'
        assert response.data['nro_comprobante'] == '111'
        assert response.data['tipo'] == 'CARGA'
        assert len(response.data['contenedores']) == 1

    def test_patch_renglones_ajusta_cc_por_diferencia(self, factory, db_setup):
        supplier = db_setup['supplier_a']
        created = _create(factory, _payload(supplier, 'CARGA', [_line(db_setup['crate'], 10, '1000.00')]))

        response = _call(factory, 'patch', 'partial_update', {
            'contenedores': [_line(db_setup['crate'], 15, '1000.00')],
        }, pk=created.data['id'])

        assert response.status_code == 200
        assert Decimal(response.data['importe']) == Decimal('15000.00')
        supplier.refresh_from_db()
        assert supplier.cuenta_corriente == Decimal('15000.00')

    def test_patch_cambio_de_proveedor_mueve_el_saldo(self, factory, db_setup):
        supplier_a = db_setup['supplier_a']
        supplier_b = db_setup['supplier_b']
        created = _create(factory, _payload(supplier_a, 'DEVOLUCION', [_line(db_setup['crate'], 10, '1000.00')]))

        response = _call(factory, 'patch', 'partial_update', {'proveedor': supplier_b.id}, pk=created.data['id'])

        assert response.status_code == 200
        supplier_a.refresh_from_db()
        supplier_b.refresh_from_db()
        assert supplier_a.cuenta_corriente == Decimal('0')
        assert supplier_b.cuenta_corriente == Decimal('-10000.00')

    def test_update_inexistente_responde_404(self, factory, db_setup):
        response = _call(factory, 'patch', 'partial_update', {'fecha': '2026-07-15'}, pk=9999)

        assert response.status_code == 404


# ── Tests: destroy ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDestroy:

    def test_destroy_elimina_y_revierte_cc(self, factory, db_setup):
        supplier = db_setup['supplier_a']
        created = _create(factory, _payload(supplier, 'CARGA', [_line(db_setup['crate'], 10, '1000.00')]))

        response = _call(factory, 'delete', 'destroy', pk=created.data['id'])

        assert response.status_code == 204
        assert not MovimientoVacio.objects.filter(id=created.data['id']).exists()
        supplier.refresh_from_db()
        assert supplier.cuenta_corriente == Decimal('0')

    def test_destroy_inexistente_responde_404(self, factory, db_setup):
        response = _call(factory, 'delete', 'destroy', pk=9999)

        assert response.status_code == 404
