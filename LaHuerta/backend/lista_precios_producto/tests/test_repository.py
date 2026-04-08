import pytest

from lista_precios.models import ListaPrecios
from lista_precios_producto.models import ListaPreciosProducto
from lista_precios_producto.repositories import ProductPriceListRepository
from producto.models import Producto
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad


@pytest.mark.django_db
class TestProductPriceListRepository:
    def setup_method(self):
        self.repository = ProductPriceListRepository()

    def _create_product(self):
        cat = Categoria.objects.create(descripcion="CatTest")
        tc = TipoContenedor.objects.create(descripcion="CJ")
        tu = TipoUnidad.objects.create(descripcion="KG")
        return Producto.objects.create(
            descripcion="ProdTest",
            categoria=cat,
            tipo_contenedor=tc,
            tipo_unidad=tu,
            cantidad_por_bulto=10,
            peso_aproximado=1.5,
        )

    # ------------------------- GET ALL -------------------------
    def test_get_all_empty(self):
        result = self.repository.get_all()
        assert result.count() == 0

    def test_get_all_with_filters(self):
        pl1 = ListaPrecios.objects.create(nombre="PL1", descripcion="D1")
        pl2 = ListaPrecios.objects.create(nombre="PL2", descripcion="D2")
        p1 = self._create_product()
        p2 = self._create_product()
        p2.descripcion = "ProdTest2"
        p2.save()

        ListaPreciosProducto.objects.create(lista_precios=pl1, producto=p1, precio_unitario=100, precio_bulto=1000)
        ListaPreciosProducto.objects.create(lista_precios=pl2, producto=p2, precio_unitario=200, precio_bulto=2000)

        assert self.repository.get_all(price_list_id=pl1.id).count() == 1
        assert self.repository.get_all(product_id=p2.id).count() == 1

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_not_found_returns_none(self):
        assert self.repository.get_by_id(9999) is None

    # ------------------------- CREATE / UPDATE / DELETE --------
    def test_create_update_destroy_ok(self):
        pl = ListaPrecios.objects.create(nombre="PL", descripcion="D")
        prod = self._create_product()

        created = self.repository.create(
            {"lista_precios": pl, "producto": prod, "precio_unitario": 10, "precio_bulto": 100}
        )
        assert created.id is not None

        updated = self.repository.update(created, {"precio_unitario": 20})
        assert updated.precio_unitario == 20

        self.repository.destroy(created)
        assert ListaPreciosProducto.objects.count() == 0

    # ------------------------- VERIFY PRODUCT ------------------
    def test_verify_product_on_price_list(self):
        pl = ListaPrecios.objects.create(nombre="PLV", descripcion="D")
        prod = self._create_product()
        ListaPreciosProducto.objects.create(lista_precios=pl, producto=prod, precio_unitario=10, precio_bulto=100)

        qs = self.repository.verify_product_on_price_list(prod.id)
        assert qs.count() == 1

