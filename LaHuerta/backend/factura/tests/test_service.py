import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from factura.service import BillService
from factura.exceptions import BillNotFoundException, BillHasPaymentsException, PriceNotFoundError
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError


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


def _make_bill_type(codigo_afip=None, id=1):
    bt = Mock()
    bt.id = id
    bt.codigo_afip = codigo_afip
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


def _make_items(qty=Decimal("10"), price=Decimal("1000")):
    entry = Mock()
    entry.precio = price
    return [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': qty}], entry


# ── _calculate_total_amount ────────────────────────────────────────────────────

def test_calculate_total_amount_multiple_items():
    service, *_ = _make_service()
    products = [
        {'cantidad': Decimal('10'), 'precio_aplicado': Decimal('100')},
        {'cantidad': Decimal('5'), 'precio_aplicado': Decimal('200')},
    ]
    assert service._calculate_total_amount(products) == Decimal('2000')


def test_calculate_total_amount_single_item():
    service, *_ = _make_service()
    products = [{'cantidad': Decimal('3'), 'precio_aplicado': Decimal('18000')}]
    assert service._calculate_total_amount(products) == Decimal('54000')


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


def test_resolve_prices_no_price_list_raises():
    service, *_ = _make_service()
    client = _make_client(lista_precios_id=None)

    with pytest.raises(PriceNotFoundError):
        service._resolve_prices(client, [
            {'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': 1}
        ])


def test_resolve_prices_missing_entry_raises():
    service, _, __, ___, price_repo, ____ = _make_service()
    client = _make_client()
    price_repo.get_by_product_and_sale_type.return_value = None

    with pytest.raises(PriceNotFoundError):
        service._resolve_prices(client, [
            {'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': 1}
        ])


# ── _adjust_client_balance ─────────────────────────────────────────────────────

def test_adjust_balance_same_client_amount_increased():
    service, _, __, client_repo, ___, ____ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("1000"))

    service._adjust_client_balance(client, client, Decimal("500"), Decimal("700"))

    assert client.cuenta_corriente == Decimal("1200")
    client_repo.update_balance.assert_called_once()


def test_adjust_balance_same_client_amount_decreased():
    service, _, __, client_repo, ___, ____ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("1000"))

    service._adjust_client_balance(client, client, Decimal("700"), Decimal("500"))

    assert client.cuenta_corriente == Decimal("800")
    client_repo.update_balance.assert_called_once()


def test_adjust_balance_same_client_same_amount_no_update():
    service, _, __, client_repo, ___, ____ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("1000"))

    service._adjust_client_balance(client, client, Decimal("500"), Decimal("500"))

    assert client.cuenta_corriente == Decimal("1000")
    client_repo.update_balance.assert_not_called()


def test_adjust_balance_client_changed():
    service, _, __, client_repo, ___, ____ = _make_service()
    old_client = _make_client(cuenta_corriente=Decimal("2000"))
    new_client = _make_client(cuenta_corriente=Decimal("500"))

    service._adjust_client_balance(old_client, new_client, Decimal("800"), Decimal("1000"))

    assert old_client.cuenta_corriente == Decimal("1200")
    assert new_client.cuenta_corriente == Decimal("1500")
    assert client_repo.update_balance.call_count == 2


# ── create_bill ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_bill_sin_afip_asigna_numero_secuencial():
    service, bill_repo, bill_product_repo, client_repo, price_repo, arca = _make_service()

    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=None)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry

    bill_mock = Mock()
    bill_repo.create.return_value = bill_mock
    bill_repo.get_last_receipt_number.return_value = 4

    data = {'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items}
    service.create_bill(data)

    arca.emit_receipt.assert_not_called()
    assert bill_mock.numero_comprobante == 5
    bill_repo.save.assert_called()


@pytest.mark.django_db
def test_create_bill_con_afip_guarda_cae():
    arca_result = {'numero_comprobante': 42, 'cae': '99887766554433', 'cae_vto': date(2026, 6, 30)}
    service, bill_repo, _, client_repo, price_repo, arca = _make_service(arca_result=arca_result)

    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry

    bill_mock = Mock()
    bill_repo.create.return_value = bill_mock

    data = {'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items}
    service.create_bill(data)

    arca.emit_receipt.assert_called_once()
    assert bill_mock.numero_comprobante == 42
    assert bill_mock.cae == '99887766554433'
    assert bill_mock.cae_vto == date(2026, 6, 30)


@pytest.mark.django_db
def test_create_bill_arca_auth_error_propagates():
    service, bill_repo, _, __, price_repo, ___ = _make_service(
        arca_raises=WSAAAuthenticationError("auth error")
    )
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_repo.create.return_value = Mock()

    with pytest.raises(WSAAAuthenticationError):
        service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})


@pytest.mark.django_db
def test_create_bill_wsfe_error_propagates():
    service, bill_repo, _, __, price_repo, ___ = _make_service(
        arca_raises=WSFEEmissionError("wsfe error")
    )
    client = _make_client()
    bill_type = _make_bill_type(codigo_afip=1)
    items, entry = _make_items()
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_repo.create.return_value = Mock()

    with pytest.raises(WSFEEmissionError):
        service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})


@pytest.mark.django_db
def test_create_bill_actualiza_cuenta_corriente():
    service, bill_repo, _, client_repo, price_repo, __ = _make_service()

    client = _make_client(cuenta_corriente=Decimal("500"))
    bill_type = _make_bill_type(codigo_afip=None)
    items, entry = _make_items(qty=Decimal("10"), price=Decimal("1000"))
    price_repo.get_by_product_and_sale_type.return_value = entry
    bill_repo.create.return_value = Mock()
    bill_repo.get_last_receipt_number.return_value = 0

    service.create_bill({'cliente': client, 'tipo_factura': bill_type, 'fecha': date.today(), 'items': items})

    assert client.cuenta_corriente == Decimal("10500")
    client_repo.update_balance.assert_called()


# ── update_bill ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_bill_not_found():
    service, bill_repo, *_ = _make_service()
    bill_repo.get_by_id.return_value = None

    with pytest.raises(BillNotFoundException):
        service.update_bill(999, {})


@pytest.mark.django_db
def test_update_bill_fecha():
    service, bill_repo, _, __, ___, ____ = _make_service()
    client = _make_client()
    bill = Mock()
    bill.importe = Decimal("1000")
    bill.cliente = client
    bill_repo.get_by_id.return_value = bill

    service.update_bill(1, {'fecha': date(2026, 7, 1)})

    assert bill.fecha == date(2026, 7, 1)
    bill_repo.save.assert_called_once()


@pytest.mark.django_db
def test_update_bill_con_items_recalcula_importe():
    service, bill_repo, bill_product_repo, _, price_repo, __ = _make_service()
    client = _make_client()
    bill = Mock()
    bill.importe = Decimal("1000")
    bill.cliente = client
    bill_repo.get_by_id.return_value = bill

    entry = Mock()
    entry.precio = Decimal("2000")
    price_repo.get_by_product_and_sale_type.return_value = entry

    service.update_bill(1, {
        'items': [{'producto': _make_product(), 'tipo_venta': _make_sale_type(), 'cantidad': Decimal('5')}]
    })

    assert bill.importe == Decimal("10000")
    bill_product_repo.replace_products.assert_called_once()


# ── delete_bill ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_delete_bill_not_found():
    service, bill_repo, *_ = _make_service()
    bill_repo.get_by_id.return_value = None

    with pytest.raises(BillNotFoundException):
        service.delete_bill(999)


@pytest.mark.django_db
def test_delete_bill_con_pagos_raises():
    service, bill_repo, *_ = _make_service()
    bill = Mock()
    bill.pagofactura_set.exists.return_value = True
    bill_repo.get_by_id.return_value = bill

    with pytest.raises(BillHasPaymentsException):
        service.delete_bill(1)


@pytest.mark.django_db
def test_delete_bill_ok_reduce_cuenta_corriente():
    service, bill_repo, _, client_repo, __, ___ = _make_service()
    client = _make_client(cuenta_corriente=Decimal("3000"))
    bill = Mock()
    bill.importe = Decimal("1000")
    bill.cliente = client
    bill.pagofactura_set.exists.return_value = False
    bill_repo.get_by_id.return_value = bill

    service.delete_bill(1)

    assert client.cuenta_corriente == Decimal("2000")
    client_repo.update_balance.assert_called_once()
    bill_repo.delete.assert_called_once_with(bill)
