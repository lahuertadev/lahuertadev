import pytest

from producto.exceptions import ProductNotFoundException
from producto.models import Producto
from producto.repositories import ProductRepository

from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad


@pytest.mark.django_db
class TestProductRepository:
    def setup_method(self):
        self.repository = ProductRepository()
        self.category = Categoria.objects.create(descripcion="Frutas")
        self.container_type = TipoContenedor.objects.create(descripcion="Cajon")
        self.unit_type = TipoUnidad.objects.create(descripcion="Kilo")

    # ------------------------- GET ALL -------------------------
    def test_get_all_returns_list(self):
        Producto.objects.create(
            descripcion="Manzana",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2,
        )
        Producto.objects.create(
            descripcion="Banana",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=12,
            peso_aproximado=1.5,
        )

        result = self.repository.get_all()

        assert result.count() == 2

    def test_get_all_empty(self):
        result = self.repository.get_all()
        assert result.count() == 0

    def test_get_all_filters_by_description(self):
        Producto.objects.create(
            descripcion="Manzana",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2,
        )
        Producto.objects.create(
            descripcion="Banana",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=12,
            peso_aproximado=1.5,
        )

        result = self.repository.get_all(description="Manzana")

        assert result.count() == 1
        assert result.first().descripcion == "Manzana"

    def test_get_all_filters_by_category_description(self):
        other_category = Categoria.objects.create(descripcion="Verduras")
        Producto.objects.create(
            descripcion="Manzana",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2,
        )
        Producto.objects.create(
            descripcion="Lechuga",
            categoria=other_category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=12,
            peso_aproximado=1.5,
        )

        result = self.repository.get_all(category="Verduras")

        assert result.count() == 1
        assert result.first().descripcion == "Lechuga"

    def test_get_all_filters_by_container_type_description(self):
        other_container = TipoContenedor.objects.create(descripcion="Bolsa")
        Producto.objects.create(
            descripcion="Manzana",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.2,
        )
        Producto.objects.create(
            descripcion="Banana",
            categoria=self.category,
            tipo_contenedor=other_container,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=12,
            peso_aproximado=1.5,
        )

        result = self.repository.get_all(container_type="Bolsa")

        assert result.count() == 1
        assert result.first().descripcion == "Banana"

    # ------------------------- GET BY ID -----------------------
    def test_get_by_id_ok(self):
        item = Producto.objects.create(
            descripcion="Pera",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=8,
            peso_aproximado=1.1,
        )

        result = self.repository.get_by_id(item.id)

        assert result.id == item.id
        assert result.descripcion == "Pera"

    def test_get_by_id_not_found(self):
        with pytest.raises(ProductNotFoundException):
            self.repository.get_by_id(9999)

    # ------------------------- CREATE --------------------------
    def test_create_ok(self):
        data = {
            "descripcion": "Durazno",
            "categoria": self.category,
            "tipo_contenedor": self.container_type,
            "tipo_unidad": self.unit_type,
            "cantidad_por_bulto": 20,
            "peso_aproximado": 2.0,
        }

        result = self.repository.create(data)

        assert result.id is not None
        assert result.descripcion == "Durazno"
        assert Producto.objects.count() == 1

    # ------------------------- UPDATE --------------------------
    def test_update_ok(self):
        item = Producto.objects.create(
            descripcion="Old",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.0,
        )

        updated = self.repository.update(item, {"descripcion": "New", "cantidad_por_bulto": 99})

        assert updated.descripcion == "New"
        assert updated.cantidad_por_bulto == 99

        item.refresh_from_db()
        assert item.descripcion == "New"
        assert item.cantidad_por_bulto == 99

    # ------------------------- DELETE --------------------------
    def test_delete_ok(self):
        item = Producto.objects.create(
            descripcion="Eliminar",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.0,
        )

        self.repository.delete(item)

        assert Producto.objects.count() == 0

    # ------------------------- VERIFY (specific) --------------
    def test_verify_products_with_category_id(self):
        assert self.repository.verify_products_with_category_id(self.category.id) is False
        Producto.objects.create(
            descripcion="Kiwi",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.0,
        )
        assert self.repository.verify_products_with_category_id(self.category.id) is True

    def test_verify_products_with_container_type_id(self):
        assert self.repository.verify_products_with_container_type_id(self.container_type.id) is False
        Producto.objects.create(
            descripcion="Uva",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.0,
        )
        assert self.repository.verify_products_with_container_type_id(self.container_type.id) is True

    def test_verify_products_with_unit_type_id(self):
        assert self.repository.verify_products_with_unit_type_id(self.unit_type.id) is False
        Producto.objects.create(
            descripcion="Naranja",
            categoria=self.category,
            tipo_contenedor=self.container_type,
            tipo_unidad=self.unit_type,
            cantidad_por_bulto=10,
            peso_aproximado=1.0,
        )
        assert self.repository.verify_products_with_unit_type_id(self.unit_type.id) is True

