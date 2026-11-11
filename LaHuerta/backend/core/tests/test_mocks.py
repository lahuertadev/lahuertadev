from decimal import Decimal
from unittest.mock import Mock

import pytest

from autenticacion.models import Usuario
from banco.models import Banco
from categoria.models import Categoria
from cheque.models import Cheque
from cheque_propio.models import OwnCheck
from cliente.models import Cliente
from compra.models import Compra
from contacto.models import Contacto
from core.tests import mocks
from estado_cheque.models import EstadoCheque
from factura.models import Factura
from lista_precios.models import ListaPrecios
from lista_precios_producto.models import ListaPreciosProducto
from localidad.models import Localidad
from mercado.models import Mercado
from movimiento_vacio.models import MovimientoVacio
from municipio.models import Municipio
from pago_cliente.models import PagoCliente
from pago_compra.models import PagoCompra, PagoCompraChequePropio
from producto.models import Producto
from proveedor.models import Proveedor
from provincia.models import Provincia
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_contenedor.models import TipoContenedor
from tipo_factura.models import TipoFactura
from tipo_pago.models import TipoPago
from tipo_unidad.models import TipoUnidad
from tipo_venta.models import TipoVenta
from tutorial.models import Tutorial, TutorialUsuario


ALL_MOCKS = [
    (mocks.mock_vat_condition, TipoCondicionIva),
    (mocks.mock_market, Mercado),
    (mocks.mock_bank, Banco),
    (mocks.mock_check_state, EstadoCheque),
    (mocks.mock_payment_type, TipoPago),
    (mocks.mock_category, Categoria),
    (mocks.mock_container_type, TipoContenedor),
    (mocks.mock_unit_type, TipoUnidad),
    (mocks.mock_sale_type, TipoVenta),
    (mocks.mock_bill_type, TipoFactura),
    (mocks.mock_province, Provincia),
    (mocks.mock_municipality, Municipio),
    (mocks.mock_locality, Localidad),
    (mocks.mock_price_list, ListaPrecios),
    (mocks.mock_client, Cliente),
    (mocks.mock_supplier, Proveedor),
    (mocks.mock_contact, Contacto),
    (mocks.mock_product, Producto),
    (mocks.mock_product_price, ListaPreciosProducto),
    (mocks.mock_bill, Factura),
    (mocks.mock_client_payment, PagoCliente),
    (mocks.mock_purchase, Compra),
    (mocks.mock_purchase_payment, PagoCompra),
    (mocks.mock_own_check_use, PagoCompraChequePropio),
    (mocks.mock_empty_movement, MovimientoVacio),
    (mocks.mock_check, Cheque),
    (mocks.mock_own_check, OwnCheck),
    (mocks.mock_user, Usuario),
    (mocks.mock_tutorial, Tutorial),
    (mocks.mock_tutorial_progress, TutorialUsuario),
]


def _is_required(field):
    return not (
        field.primary_key or field.null or field.blank or field.has_default()
        or getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False)
    )


@pytest.mark.parametrize('builder, model', ALL_MOCKS, ids=[case[0].__name__ for case in ALL_MOCKS])
def test_mock_has_a_value_for_every_required_field(builder, model):
    '''
    Si un modelo suma un campo obligatorio, su constructor tiene que darle un valor.
    '''
    mocked = builder()

    for field in filter(_is_required, model._meta.concrete_fields):
        value = getattr(mocked, field.name)
        if field.is_relation:
            assert getattr(mocked, field.attname) == value.id, field.name
        else:
            assert not isinstance(value, Mock), field.name


@pytest.mark.parametrize('builder, model', ALL_MOCKS, ids=[case[0].__name__ for case in ALL_MOCKS])
def test_mock_rejects_fields_the_model_does_not_have(builder, model):
    with pytest.raises(AttributeError):
        builder(campo_inexistente=1)


@pytest.mark.parametrize('builder, model', ALL_MOCKS, ids=[case[0].__name__ for case in ALL_MOCKS])
def test_mock_rejects_reading_or_assigning_unknown_attributes(builder, model):
    mocked = builder()

    with pytest.raises(AttributeError):
        mocked.campo_inexistente
    with pytest.raises(AttributeError):
        mocked.campo_inexistente = 1


@pytest.mark.parametrize('builder, model', ALL_MOCKS, ids=[case[0].__name__ for case in ALL_MOCKS])
def test_mock_is_recognized_as_its_model_by_serializers(builder, model):
    mocked = builder()

    assert mocked.pk == mocked.id
    assert mocked._meta.model is model


@pytest.mark.parametrize('builder, model', ALL_MOCKS, ids=[case[0].__name__ for case in ALL_MOCKS])
def test_mock_generates_different_ids(builder, model):
    assert builder().id != builder().id


def test_mock_uses_overrides_and_given_relations():
    market = mocks.mock_market(descripcion='Central')

    supplier = mocks.mock_supplier(nombre='Pepe', mercado=market)

    assert supplier.nombre == 'Pepe'
    assert supplier.mercado is market
    assert supplier.mercado_id == market.id


def test_mock_relation_set_to_none_leaves_id_empty():
    client = mocks.mock_client(lista_precios=None)

    assert client.lista_precios is None
    assert client.lista_precios_id is None


def test_mock_relation_managers_can_be_configured():
    own_check = mocks.mock_own_check()
    own_check.pagocompra_set.exists.return_value = True

    assert own_check.pagocompra_set.exists() is True


def test_purchase_annotation_exists_only_when_given():
    assert not hasattr(mocks.mock_purchase(), 'total_payments')

    buy = mocks.mock_purchase(total_payments=Decimal('300.00'))

    assert buy.total_payments == Decimal('300.00')


def test_purchase_payment_takes_supplier_from_purchase():
    buy = mocks.mock_purchase()

    payment = mocks.mock_purchase_payment(compra=buy)

    assert payment.proveedor is buy.proveedor
    assert payment.proveedor_id == buy.proveedor.id


def test_purchase_payment_builds_purchase_of_given_supplier():
    supplier = mocks.mock_supplier()

    payment = mocks.mock_purchase_payment(proveedor=supplier)

    assert payment.compra.proveedor is supplier


def test_purchase_payment_on_account_without_purchase():
    supplier = mocks.mock_supplier()

    payment = mocks.mock_purchase_payment(proveedor=supplier, compra=None)

    assert payment.compra is None
    assert payment.compra_id is None
    assert payment.proveedor is supplier


def test_purchase_payment_with_own_check_uses_it_for_the_whole_amount():
    own_check = mocks.mock_own_check()

    payment = mocks.mock_purchase_payment(cheque_propio=own_check, importe_abonado=Decimal('700.00'))

    use = payment.own_check_uses.all()[0]
    assert use.cheque_propio is own_check
    assert use.pago_compra is payment
    assert use.importe == Decimal('700.00')


def test_contact_of_a_supplier_does_not_build_a_client():
    supplier = mocks.mock_supplier()

    contact = mocks.mock_contact(proveedor=supplier)

    assert contact.proveedor is supplier
    assert contact.cliente is None
