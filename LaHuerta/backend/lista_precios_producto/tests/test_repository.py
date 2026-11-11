import pytest

from lista_precios_producto.models import ListaPreciosProducto
from lista_precios_producto.repositories import ProductPriceListRepository
from core.tests.factories import make_price_list, make_product, make_product_price, make_sale_type


@pytest.mark.django_db
class TestProductPriceListRepository:
    def setup_method(self):
        self.repository = ProductPriceListRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_empty(self):
        result = self.repository.get_all(price_list_id=make_price_list().id)
        assert result.count() == 0

    def test_get_all_with_filters(self):
        pl1 = make_price_list()
        pl2 = make_price_list()
        p1 = make_product()
        p2 = make_product()

        make_product_price(lista_precios=pl1, producto=p1)
        make_product_price(lista_precios=pl1, producto=p2)
        make_product_price(lista_precios=pl2, producto=p2)

        assert self.repository.get_all(price_list_id=pl1.id).count() == 2
        assert self.repository.get_all(price_list_id=pl1.id, product_id=p2.id).count() == 1
        assert self.repository.get_all(price_list_id=pl2.id, product_id=p1.id).count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_not_found_returns_none(self):
        assert self.repository.get_by_id(9999) is None

    # ------------------------- CREATE / UPDATE / DELETE --------
    def test_create_update_destroy_ok(self):
        created = self.repository.create({
            "lista_precios": make_price_list(),
            "producto": make_product(),
            "tipo_venta": make_sale_type(),
            "precio": 100,
        })
        assert created.id is not None

        updated = self.repository.update(created, {"precio": 200})
        assert updated.precio == 200

        self.repository.destroy(created)
        assert ListaPreciosProducto.objects.count() == 0

    # ------------------------- VERIFY PRODUCT ------------------
    def test_verify_product_on_price_list(self):
        prod = make_product()
        make_product_price(producto=prod)

        qs = self.repository.verify_product_on_price_list(prod.id)
        assert qs.count() == 1

