import pytest
from django.db import IntegrityError

from lista_precios.models import ListaPrecios
from lista_precios.repositories import PricesListRepository
from lista_precios_producto.models import ListaPreciosProducto
from producto.models import Producto
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad


@pytest.mark.django_db
class TestPricesListRepository:
    def setup_method(self):
        self.repository = PricesListRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_prices_list_returns_queryset(self):
        ListaPrecios.objects.create(nombre="Lista 1", descripcion="Desc 1")
        ListaPrecios.objects.create(nombre="Lista 2", descripcion="Desc 2")

        result = self.repository.get_all_prices_list()

        assert result.count() == 2

    def test_get_all_prices_list_empty(self):
        result = self.repository.get_all_prices_list()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_prices_list_by_id_ok(self):
        item = ListaPrecios.objects.create(nombre="Lista", descripcion="Desc")

        result = self.repository.get_prices_list_by_id(item.id)

        assert result is not None
        assert result.id == item.id
        assert result.nombre == "Lista"

    def test_get_prices_list_by_id_not_found_returns_none(self):
        result = self.repository.get_prices_list_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_prices_list_ok(self):
        created = self.repository.create_prices_list({"nombre": "Nueva", "descripcion": "Desc"})

        assert created.id is not None
        assert created.nombre == "Nueva"
        assert ListaPrecios.objects.count() == 1

    def test_create_prices_list_duplicate_name_raises(self):
        ListaPrecios.objects.create(nombre="Duplicada", descripcion="Desc")
        with pytest.raises(IntegrityError):
            self.repository.create_prices_list({"nombre": "Duplicada", "descripcion": "Otra"})

    # ------------------------- UPDATE --------------------------
    def test_modify_prices_list_ok(self):
        item = ListaPrecios.objects.create(nombre="Old", descripcion="Old desc")

        updated = self.repository.modify_prices_list(item, {"nombre": "New", "descripcion": "New desc"})

        assert updated.nombre == "New"
        item.refresh_from_db()
        assert item.nombre == "New"

    def test_modify_prices_list_same_name_ok(self):
        """
        Test que verifica que se puede actualizar sin cambiar el nombre
        """
        item = ListaPrecios.objects.create(nombre="Lista", descripcion="Desc Original")

        updated = self.repository.modify_prices_list(item, {"nombre": "Lista", "descripcion": "Desc Nueva"})

        assert updated.nombre == "Lista"
        assert updated.descripcion == "Desc Nueva"
        item.refresh_from_db()
        assert item.descripcion == "Desc Nueva"

    def test_modify_prices_list_duplicate_name_raises_value_error(self):
        """
        Test que verifica que lanza ValueError cuando se intenta cambiar a un nombre existente
        """
        ListaPrecios.objects.create(nombre="Existente", descripcion="Desc 1")
        item = ListaPrecios.objects.create(nombre="Original", descripcion="Desc 2")

        with pytest.raises(ValueError, match="Ya existe una lista de precios con el nombre 'Existente'"):
            self.repository.modify_prices_list(item, {"nombre": "Existente"})

    def test_modify_prices_list_only_description(self):
        """
        Test que verifica que se puede actualizar solo la descripción
        """
        item = ListaPrecios.objects.create(nombre="Lista", descripcion="Desc Original")

        updated = self.repository.modify_prices_list(item, {"descripcion": "Desc Nueva"})

        assert updated.nombre == "Lista"
        assert updated.descripcion == "Desc Nueva"

    # ------------------------- DELETE --------------------------
    def test_destroy_prices_list_ok(self):
        item = ListaPrecios.objects.create(nombre="Eliminar", descripcion="Desc")

        self.repository.destroy_prices_list(item)

        assert ListaPrecios.objects.count() == 0

    # ------------------------- DUPLICATE -----------------------
    def test_generate_unique_name_no_collision(self):
        """
        Test que verifica que generate_unique_name devuelve el nombre base si no existe
        """
        base_name = "Nueva Lista"
        unique_name = self.repository.generate_unique_name(base_name)
        assert unique_name == base_name

    def test_generate_unique_name_with_collision(self):
        """
        Test que verifica que generate_unique_name agrega contador cuando hay colisión
        """
        ListaPrecios.objects.create(nombre="Copia de Lista A", descripcion="Test")
        
        base_name = "Copia de Lista A"
        unique_name = self.repository.generate_unique_name(base_name)
        assert unique_name == "Copia de Lista A (1)"

    def test_generate_unique_name_multiple_collisions(self):
        """
        Test que verifica que generate_unique_name maneja múltiples colisiones
        """
        ListaPrecios.objects.create(nombre="Copia de Lista B", descripcion="Test")
        ListaPrecios.objects.create(nombre="Copia de Lista B (1)", descripcion="Test")
        ListaPrecios.objects.create(nombre="Copia de Lista B (2)", descripcion="Test")
        
        base_name = "Copia de Lista B"
        unique_name = self.repository.generate_unique_name(base_name)
        assert unique_name == "Copia de Lista B (3)"

    def test_duplicate_prices_list_success(self):
        """
        Test que verifica que duplicate_prices_list copia correctamente
        """

        category = Categoria.objects.create(descripcion='Frutas')
        container_type = TipoContenedor.objects.create(descripcion='Cajón')
        unit_type = TipoUnidad.objects.create(descripcion='kg')

        product_1 = Producto.objects.create(
            descripcion='Manzana',
            categoria=category,
            tipo_contenedor=container_type,
            tipo_unidad=unit_type,
            bulto=10
        )

        product_2 = Producto.objects.create(
            descripcion='Banana',
            categoria=category,
            tipo_contenedor=container_type,
            tipo_unidad=unit_type,
            bulto=15
        )

        original_list = ListaPrecios.objects.create(
            nombre='Lista Original',
            descripcion='Descripción de prueba'
        )

        ListaPreciosProducto.objects.create(
            lista_precios=original_list,
            producto=product_1,
            precio_unitario=100,
            precio_bulto=900
        )

        ListaPreciosProducto.objects.create(
            lista_precios=original_list,
            producto=product_2,
            precio_unitario=150,
            precio_bulto=2000
        )

        new_list = self.repository.duplicate_prices_list(original_list)

        # Verificaciones
        assert new_list is not None
        assert new_list.nombre == 'Copia de Lista Original'
        assert new_list.descripcion == 'Descripción de prueba'
        assert new_list.id != original_list.id

        # Verificar que se copiaron los productos
        productos_originales = ListaPreciosProducto.objects.filter(lista_precios=original_list).count()
        productos_nuevos = ListaPreciosProducto.objects.filter(lista_precios=new_list).count()
        assert productos_originales == productos_nuevos

        # Verificar que los precios se copiaron correctamente
        original_product = ListaPreciosProducto.objects.get(
            lista_precios=original_list,
            producto=product_1
        )
        new_product = ListaPreciosProducto.objects.get(
            lista_precios=new_list,
            producto=product_1
        )
        assert original_product.precio_unitario == new_product.precio_unitario
        assert original_product.precio_bulto == new_product.precio_bulto

    def test_duplicate_prices_list_empty_list(self):
        """
        Test que verifica que se puede duplicar una lista sin productos
        """
        from lista_precios_producto.models import ListaPreciosProducto

        original_list = ListaPrecios.objects.create(
            nombre='Lista Vacía',
            descripcion='Sin productos'
        )

        new_list = self.repository.duplicate_prices_list(original_list)

        assert new_list is not None
        assert new_list.nombre == 'Copia de Lista Vacía'
        
        productos_count = ListaPreciosProducto.objects.filter(lista_precios=new_list).count()
        assert productos_count == 0

    def test_duplicate_prices_list_unique_names(self):
        """
        Test que verifica que las duplicaciones múltiples generan nombres únicos
        """
        original_list = ListaPrecios.objects.create(
            nombre='Lista Test',
            descripcion='Test'
        )

        # Primera duplicación
        copy_1 = self.repository.duplicate_prices_list(original_list)
        assert copy_1.nombre == 'Copia de Lista Test'

        # Segunda duplicación
        copy_2 = self.repository.duplicate_prices_list(original_list)
        assert copy_2.nombre == 'Copia de Lista Test (1)'

        # Tercera duplicación
        copy_3 = self.repository.duplicate_prices_list(original_list)
        assert copy_3.nombre == 'Copia de Lista Test (2)'

