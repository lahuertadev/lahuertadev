import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from factura.service import BillService
from factura.exceptions import (
    BillNotFoundException, BillHasPaymentsException,
    BillAlreadyEmittedException, PriceNotFoundError, DebitNoteValidationError,
)
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_service(arca_result=None, arca_raises=None):
    bill_repo = Mock()
    bill_product_repo = Mock()
    client_repo = Mock()
    price_repo = Mock()
    arca_service = Mock()

    if arca_raises:
        arca_service.emit_receipt.side_effect = arca_raises
    else:
        arca_service.emit_receipt.return_value = arca_result or {
            'numero_comprobante': 1,
            'cae': '12345678901234',
            'cae_vto': date(2026, 6, 1),
        }

    service = BillService(
        bill_repository=bill_repo,
        bill_product_repository=bill_product_repo,
        client_repository=client_repo,
        price_list_product_repository=price_repo,
        arca_service=arca_service,
    )
    return service, bill_repo, bill_product_repo, client_repo, price_repo, arca_service


def _make_bill_type(codigo_afip=None, id=1, descripcion="Remito"):
    bt = Mock()
    bt.id = id
    bt.codigo_afip = codigo_afip
    bt.descripcion = descripcion
    return bt


def _make_client(lista_precios_id=10, cuenta_corriente=Decimal("0.00")):
    client = Mock()
    client.lista_precios_id = lista_precios_id
    client.cuenta_corriente = cuenta_corriente
    client.cuit = "20123456789"
    client.razon_social = "Test SA"
    client.condicion_IVA = Mock()
    client.condicion_IVA.codigo_afip = 1
    return client


def _make_product(id=1):
    p = Mock()
    p.id = id
    p.__str__ = lambda self: f"Prod {id}"
    return p


def _make_sale_type(id=1):
    st = Mock()
    st.id = id
    st.__str__ = lambda self: f"TV {id}"
    return st


def _make_items(qty=Decimal("10"), price=Decimal("1000"), iva_rate='10.5'):
    entry = Mock()
    entry.precio = price
    items = [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': qty, 'iva_rate': iva_rate}]
    return items, entry


def _make_associated_bill(cae='12345678901234', invoice_type_code=1):
    bill = Mock()
    bill.cae = cae
    bill.numero_comprobante = 1
    bill.tipo_factura = Mock()
    bill.tipo_factura.codigo_afip = invoice_type_code
    bill.tipo_factura.descripcion = "Factura A"
    return bill


def _make_bill_mock():
    bill = Mock()
    bill.total = Decimal("0")
    bill.cae = None
    bill.pagofactura_set = Mock()
    bill.pagofactura_set.exists.return_value = False
    return bill


# ── _calculate_total_amount ────────────────────────────────────────────────────

def test_calculate_total_amount_multiple_items():
    service, *_ = _make_service()
    products = [
        {'cantidad': Decimal('10'), 'precio_aplicado': Decimal('100')},
        {'cantidad': Decimal('5'),  'precio_aplicado': Decimal('200')},
    ]
    assert service._calculate_total_amount(products) == Decimal('2000')


def test_calculate_total_amount_single_item():
    service, *_ = _make_service()
    products = [{'cantidad': Decimal('3'), 'precio_aplicado': Decimal('18000')}]
    assert service._calculate_total_amount(products) == Decimal('54000')


# ── _compute_total ─────────────────────────────────────────────────────────────

def test_compute_total_remito_sin_iva():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=None)
    products = [{'cantidad': Decimal('10'), 'precio_aplicado': Decimal('1000'), 'iva_rate': '10.5'}]
    assert service._compute_total(products, bill_type) == Decimal('10000')


def test_compute_total_factura_aplica_iva():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=1)
    products = [{'cantidad': Decimal('10'), 'precio_aplicado': Decimal('1000'), 'iva_rate': '10.5'}]
    assert service._compute_total(products, bill_type) == Decimal('11050.00')


def test_compute_total_multiples_tasas():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=1)
    products = [
        {'cantidad': Decimal('10'), 'precio_aplicado': Decimal('1000'), 'iva_rate': '10.5'},
        {'cantidad': Decimal('5'),  'precio_aplicado': Decimal('1000'), 'iva_rate': '21'},
    ]
    # 10000 * 1.105 + 5000 * 1.21 = 11050 + 6050 = 17100
    assert service._compute_total(products, bill_type) == Decimal('17100.00')


def test_compute_total_usa_default_iva_si_no_viene():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=1)
    products = [{'cantidad': Decimal('10'), 'precio_aplicado': Decimal('1000')}]
    assert service._compute_total(products, bill_type) == Decimal('11050.00')


# ── _build_iva_breakdown ───────────────────────────────────────────────────────

def test_build_iva_breakdown_tasa_unica():
    service, *_ = _make_service()
    products = [
        {'cantidad': Decimal('10'), 'precio_aplicado': Decimal('1000'), 'iva_rate': '10.5'},
        {'cantidad': Decimal('5'),  'precio_aplicado': Decimal('1000'), 'iva_rate': '10.5'},
    ]
    breakdown = service._build_iva_breakdown(products)
    assert len(breakdown) == 1
    assert breakdown[0]['iva_id'] == 4       # código AFIP para 10.5%
    assert breakdown[0]['base_imp'] == 15000
    assert breakdown[0]['importe'] == 1575.0


def test_build_iva_breakdown_multiples_tasas():
    service, *_ = _make_service()
    products = [
        {'cantidad': Decimal('10'), 'precio_aplicado': Decimal('1000'), 'iva_rate': '10.5'},
        {'cantidad': Decimal('5'),  'precio_aplicado': Decimal('1000'), 'iva_rate': '21'},
    ]
    breakdown = service._build_iva_breakdown(products)
    assert len(breakdown) == 2
    ids = {item['iva_id'] for item in breakdown}
    assert 4 in ids   # 10.5%
    assert 5 in ids   # 21%


# ── _resolve_prices ────────────────────────────────────────────────────────────

def test_resolve_prices_ok():
    service, _, __, ___, price_repo, ____ = _make_service()
    client = _make_client()
    entry = Mock()
    entry.precio = Decimal('18000')
    price_repo.get_by_product_and_sale_type.return_value = entry

    result = service._resolve_prices(client, [
        {'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': Decimal('5')}
    ])
    assert result[0]['precio_aplicado'] == Decimal('18000')


def test_resolve_prices_sin_lista_raises():
    service, *_ = _make_service()
    client = _make_client(lista_precios_id=None)

    with pytest.raises(PriceNotFoundError):
        service._resolve_prices(client, [
            {'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': 1}
        ])


def test_resolve_prices_sin_entrada_raises():
    service, _, __, ___, price_repo, ____ = _make_service()
    client = _make_client()
    price_repo.get_by_product_and_sale_type.return_value = None

    with pytest.raises(PriceNotFoundError):
        service._resolve_prices(client, [
            {'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': 1}
        ])


# ── _use_manual_prices ─────────────────────────────────────────────────────────

def test_use_manual_prices_sin_precio_raises():
    service, *_ = _make_service()
    products = [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': Decimal('5')}]
    with pytest.raises(PriceNotFoundError):
        service._use_manual_prices(products)


def test_use_manual_prices_con_precio_ok():
    service, *_ = _make_service()
    products = [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': Decimal('5'), 'precio_aplicado': Decimal('100')}]
    result = service._use_manual_prices(products)
    assert result == products


# ── _validate_debit_note ───────────────────────────────────────────────────────

def test_validate_debit_note_sin_factura_asociada_raises():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=2)
    with pytest.raises(DebitNoteValidationError, match="referenciar"):
        service._validate_debit_note(bill_type, None)


def test_validate_debit_note_factura_sin_cae_raises():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=2)
    associated = _make_associated_bill(cae=None)
    with pytest.raises(DebitNoteValidationError, match="emitida"):
        service._validate_debit_note(bill_type, associated)


def test_validate_debit_note_tipo_incompatible_raises():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=2, descripcion="Nota de Débito A")   # ND A esperaba Factura A (1)
    associated = _make_associated_bill(invoice_type_code=6)                       # pero viene Factura B (6)
    with pytest.raises(DebitNoteValidationError, match="incompatible"):
        service._validate_debit_note(bill_type, associated)


def test_validate_debit_note_ok():
    service, *_ = _make_service()
    bill_type = _make_bill_type(codigo_afip=2)
    associated = _make_associated_bill(invoice_type_code=1)  # ND A → Factura A ✓
    service._validate_debit_note(bill_type, associated)      # no debe lanzar


# ── _adjust_client_balance ─────────────────────────────────────────────────────

def test_adjust_balance_mismo_cliente_importe_aumenta():
    service, _, __, client_repo, ___, ____ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("1000"))
    service._adjust_client_balance(client, client, Decimal("500"), Decimal("700"))
    assert client.cuenta_corriente == Decimal("1200")
    client_repo.update_balance.assert_called_once()


def test_adjust_balance_mismo_cliente_importe_disminuye():
    service, _, __, client_repo, ___, ____ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("1000"))
    service._adjust_client_balance(client, client, Decimal("700"), Decimal("500"))
    assert client.cuenta_corriente == Decimal("800")


def test_adjust_balance_mismo_cliente_mismo_importe_no_actualiza():
    service, _, __, client_repo, ___, ____ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("1000"))
    service._adjust_client_balance(client, client, Decimal("500"), Decimal("500"))
    assert client.cuenta_corriente == Decimal("1000")
    client_repo.update_balance.assert_not_called()


def test_adjust_balance_cliente_cambia():
    service, _, __, client_repo, ___, ____ = _make_service()
    old_client = _make_client(cuenta_corriente=Decimal("2000"))
    new_client = _make_client(cuenta_corriente=Decimal("500"))
    service._adjust_client_balance(old_client, new_client, Decimal("800"), Decimal("1000"))
    assert old_client.cuenta_corriente == Decimal("1200")
    assert new_client.cuenta_corriente == Decimal("1500")
    assert client_repo.update_balance.call_count == 2


# ── create_bill ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_bill_remito_numero_secuencial():
    service, bill_repo, _, __, price_repo, arca = _make_service()
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=None)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_mock = _make_bill_mock()
    bill_repo.create.return_value = bill_mock
    bill_repo.get_last_receipt_number.return_value = 4

    service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})

    arca.emit_receipt.assert_not_called()
    assert bill_mock.numero_comprobante == 5


@pytest.mark.django_db
def test_create_bill_remito_total_igual_a_subtotal():
    service, bill_repo, _, client_repo, price_repo, __ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("0"))
    bill_type = _make_bill_type(codigo_afip=None)
    items, entry = _make_items(qty=Decimal("10"), price=Decimal("1000"))
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_mock = _make_bill_mock()
    bill_repo.create.return_value = bill_mock
    bill_repo.get_last_receipt_number.return_value = 0

    service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})

    _, kwargs = bill_repo.create.call_args
    assert kwargs['subtotal'] == Decimal('10000')
    assert kwargs['total'] == Decimal('10000')


@pytest.mark.django_db
def test_create_bill_electronica_total_incluye_iva():
    service, bill_repo, _, client_repo, price_repo, arca = _make_service()
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items(qty=Decimal("10"), price=Decimal("1000"), iva_rate='10.5')
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_mock = _make_bill_mock()
    bill_repo.create.return_value = bill_mock

    service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})

    _, kwargs = bill_repo.create.call_args
    assert kwargs['subtotal'] == Decimal('10000')
    assert kwargs['total'] == Decimal('11050.00')


@pytest.mark.django_db
def test_create_bill_cuenta_corriente_usa_total_con_iva():
    service, bill_repo, _, client_repo, price_repo, __ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("0"))
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items(qty=Decimal("10"), price=Decimal("1000"), iva_rate='10.5')
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_mock = _make_bill_mock()
    bill_repo.create.return_value = bill_mock

    service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})

    assert client.cuenta_corriente == Decimal('11050.00')


@pytest.mark.django_db
def test_create_bill_electronica_guarda_cae():
    arca_result = {'numero_comprobante': 42, 'cae': '99887766554433', 'cae_vto': date(2026, 6, 30)}
    service, bill_repo, _, __, price_repo, arca = _make_service(arca_result=arca_result)
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_mock = _make_bill_mock()
    bill_repo.create.return_value = bill_mock

    service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})

    arca.emit_receipt.assert_called_once()
    assert bill_mock.cae == '99887766554433'
    assert bill_mock.numero_comprobante == 42


@pytest.mark.django_db
def test_create_bill_nd_sin_factura_asociada_raises():
    service, bill_repo, _, __, price_repo, ___ = _make_service()
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=2, descripcion="Nota de Débito A")
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_repo.create.return_value = _make_bill_mock()

    with pytest.raises(DebitNoteValidationError):
        service.create_bill({
            'cliente': client, 'tipo_factura': bill_type,
            'fecha': date.today(), 'items': items,
        })


@pytest.mark.django_db
def test_create_bill_nd_pasa_cbte_asoc_a_arca():
    arca_result = {'numero_comprobante': 1, 'cae': '11111111111111', 'cae_vto': date(2026, 6, 30)}
    service, bill_repo, _, __, price_repo, arca = _make_service(arca_result=arca_result)
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=2, descripcion="Nota de Débito A")
    associated = _make_associated_bill(cae='99999999999999', invoice_type_code=1)
    items = [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': Decimal('5'), 'precio_aplicado': Decimal('100'), 'iva_rate': '10.5'}]
    bill_repo.create.return_value = _make_bill_mock()

    service.create_bill({
        'cliente': client, 'tipo_factura': bill_type,
        'fecha': date.today(), 'items': items,
        'factura_asociada': associated,
    })

    call_kwargs = arca.emit_receipt.call_args[1]
    assert call_kwargs['cbte_asoc']['tipo'] == 1
    assert call_kwargs['cbte_asoc']['nro'] == 1


@pytest.mark.django_db
def test_create_bill_arca_auth_error_propagates():
    service, bill_repo, _, __, price_repo, ___ = _make_service(arca_raises=WSAAAuthenticationError("auth"))
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_repo.create.return_value = _make_bill_mock()

    with pytest.raises(WSAAAuthenticationError):
        service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})


@pytest.mark.django_db
def test_create_bill_wsfe_error_propagates():
    service, bill_repo, _, __, price_repo, ___ = _make_service(arca_raises=WSFEEmissionError("wsfe"))
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_repo.create.return_value = _make_bill_mock()

    with pytest.raises(WSFEEmissionError):
        service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})


# ── update_bill ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_bill_not_found():
    service, bill_repo, *_ = _make_service()
    bill_repo.get_by_id.return_value = None
    with pytest.raises(BillNotFoundException):
        service.update_bill(999, {})


@pytest.mark.django_db
def test_update_bill_ya_emitida_raises():
    service, bill_repo, *_ = _make_service()
    bill = Mock()
    bill.cae = '12345678901234'
    bill_repo.get_by_id.return_value = bill
    with pytest.raises(BillAlreadyEmittedException):
        service.update_bill(1, {'fecha': date.today()})


@pytest.mark.django_db
def test_update_bill_fecha():
    service, bill_repo, _, __, ___, ____ = _make_service()
    client = _make_client()
    bill = Mock()
    bill.total = Decimal("1000")
    bill.cae = None
    bill.cliente = client
    bill_repo.get_by_id.return_value = bill

    service.update_bill(1, {'fecha': date(2026, 7, 1)})

    assert bill.fecha == date(2026, 7, 1)
    bill_repo.save.assert_called_once()


@pytest.mark.django_db
def test_update_bill_con_items_recalcula_subtotal_y_total():
    service, bill_repo, bill_product_repo, _, price_repo, __ = _make_service()
    client = _make_client()
    bill = Mock()
    bill.total = Decimal("1000")
    bill.cae = None
    bill.cliente = client
    bill.tipo_factura = _make_bill_type(codigo_afip=None)  # remito: total == subtotal
    bill_repo.get_by_id.return_value = bill
    entry = Mock()
    entry.precio = Decimal("2000")
    price_repo.get_by_product_and_sale_type.return_value = entry

    service.update_bill(1, {
        'items': [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': Decimal('5')}]
    })

    assert bill.subtotal == Decimal("10000")
    assert bill.total == Decimal("10000")
    bill_product_repo.replace_products.assert_called_once()


# ── delete_bill ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_delete_bill_not_found():
    service, bill_repo, *_ = _make_service()
    bill_repo.get_by_id.return_value = None
    with pytest.raises(BillNotFoundException):
        service.delete_bill(999)


@pytest.mark.django_db
def test_delete_bill_ya_emitida_raises():
    service, bill_repo, *_ = _make_service()
    bill = Mock()
    bill.cae = '12345678901234'
    bill_repo.get_by_id.return_value = bill
    with pytest.raises(BillAlreadyEmittedException):
        service.delete_bill(1)


@pytest.mark.django_db
def test_delete_bill_con_pagos_raises():
    service, bill_repo, *_ = _make_service()
    bill = Mock()
    bill.cae = None
    bill.pagofactura_set.exists.return_value = True
    bill_repo.get_by_id.return_value = bill
    with pytest.raises(BillHasPaymentsException):
        service.delete_bill(1)


@pytest.mark.django_db
def test_delete_bill_reduce_cuenta_corriente():
    service, bill_repo, _, client_repo, __, ___ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("3000"))
    bill = Mock()
    bill.total = Decimal("1000")
    bill.cae = None
    bill.cliente = client
    bill.pagofactura_set.exists.return_value = False
    bill_repo.get_by_id.return_value = bill

    service.delete_bill(1)

    assert client.cuenta_corriente == Decimal("2000")
    client_repo.update_balance.assert_called_once()
    bill_repo.delete.assert_called_once_with(bill)
