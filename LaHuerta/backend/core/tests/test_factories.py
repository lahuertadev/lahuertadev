import pytest

from core.tests import factories


ALL_FACTORIES = [
    factories.make_province,
    factories.make_municipality,
    factories.make_locality,
    factories.make_vat_condition,
    factories.make_market,
    factories.make_bank,
    factories.make_check_state,
    factories.make_payment_type,
    factories.make_category,
    factories.make_container_type,
    factories.make_unit_type,
    factories.make_sale_type,
    factories.make_bill_type,
    factories.make_price_list,
    factories.make_client,
    factories.make_supplier,
    factories.make_contact,
    factories.make_product,
    factories.make_product_price,
    factories.make_bill,
    factories.make_client_payment,
    factories.make_purchase,
    factories.make_purchase_payment,
    factories.make_empty_movement,
    factories.make_check,
    factories.make_own_check,
    factories.make_own_check_use,
    factories.make_user,
    factories.make_news,
    factories.make_news_view,
    factories.make_tutorial,
    factories.make_tutorial_step,
    factories.make_tutorial_progress,
]


@pytest.mark.django_db
@pytest.mark.parametrize('factory', ALL_FACTORIES, ids=lambda f: f.__name__)
def test_factory_creates_valid_objects(factory):
    '''
    Cada factory crea su objeto con los datos por defecto, y dos llamadas seguidas no chocan
    en los campos únicos.
    '''
    first = factory()
    second = factory()

    assert first.pk is not None
    assert second.pk is not None
    assert first.pk != second.pk


@pytest.mark.django_db
def test_factory_uses_overrides_and_given_dependencies():
    market = factories.make_market(descripcion='Central')

    supplier = factories.make_supplier(nombre='Pepe', mercado=market)

    assert supplier.nombre == 'Pepe'
    assert supplier.mercado == market


@pytest.mark.django_db
def test_purchase_payment_takes_supplier_from_purchase():
    buy = factories.make_purchase()

    payment = factories.make_purchase_payment(compra=buy)

    assert payment.proveedor == buy.proveedor


@pytest.mark.django_db
def test_purchase_payment_creates_purchase_of_given_supplier():
    supplier = factories.make_supplier()

    payment = factories.make_purchase_payment(proveedor=supplier)

    assert payment.compra.proveedor == supplier


@pytest.mark.django_db
def test_purchase_payment_on_account_without_purchase():
    supplier = factories.make_supplier()

    payment = factories.make_purchase_payment(proveedor=supplier, compra=None)

    assert payment.compra is None
    assert payment.proveedor == supplier
