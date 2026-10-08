import pytest
from django.db import IntegrityError

from lista_precios.models import ListaPrecios
from lista_precios.repositories import PricesListRepository
from lista_precios_producto.models import ListaPreciosProducto
from producto.models import Producto
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad
from tipo_venta.models import TipoVenta
from decimal import Decimal
from provincia.models import Provincia
from municipio.models import Municipio
from localidad.models import Localidad
from tipo_condicion_iva.models import TipoCondicionIva
from cliente.models import Cliente


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

    def test_get_all_prices_list_with_filter(self):
        ListaPrecios.objects.create(nombre="Lista Verano", descripcion="Desc 1")
        ListaPrecios.objects.create(nombre="Lista Invierno", descripcion="Desc 2")
        ListaPrecios.objects.create(nombre="Precios Especiales", descripcion="Desc 3")

        result = self.repository.get_all_prices_list(nombre="Lista")

        assert result.count() == 2
        assert all("Lista" in item.nombre for item in result)

    def test_get_all_prices_list_with_partial_filter(self):
        ListaPrecios.objects.create(nombre="Verano 2024", descripcion="Desc 1")
        ListaPrecios.objects.create(nombre="Verano 2025", descripcion="Desc 2")
        ListaPrecios.objects.create(nombre="Invierno 2024", descripcion="Desc 3")

        result = self.repository.get_all_prices_list(nombre="Verano")

        assert result.count() == 2
        assert all("Verano" in item.nombre for item in result)

    def test_get_all_prices_list_filter_case_insensitive(self):
        ListaPrecios.objects.create(nombre="Lista Especial", descripcion="Desc 1")
        ListaPrecios.objects.create(nombre="Otra Lista", descripcion="Desc 2")

        result = self.repository.get_all_prices_list(nombre="lista")

        assert result.count() == 2

    def test_get_all_prices_list_filter_no_results(self):
        ListaPrecios.objects.create(nombre="Lista A", descripcion="Desc 1")
        ListaPrecios.objects.create(nombre="Lista B", descripcion="Desc 2")

        result = self.repository.get_all_prices_list(nombre="NoExiste")

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

    # ------------------------- CLIENTES ASIGNADOS --------------
    def _create_client(self, cuit, business_name, price_list):
        province, _ = Provincia.objects.get_or_create(id='06', defaults={'nombre': 'Buenos Aires'})
        municipality, _ = Municipio.objects.get_or_create(id='064270', defaults={'nombre': 'CABA', 'provincia': province})
        locality, _ = Localidad.objects.get_or_create(id='0642701009', defaults={'nombre': 'CABA', 'municipio': municipality})
        iva_condition, _ = TipoCondicionIva.objects.get_or_create(descripcion='RI')
        return Cliente.objects.create(
            cuit=cuit,
            razon_social=business_name,
            cuenta_corriente=Decimal('0.00'),
            telefono='1122334455',
            localidad=locality,
            condicion_IVA=iva_condition,
            lista_precios=price_list,
        )

    def test_count_assigned_clients(self):
        assigned_list = ListaPrecios.objects.create(nombre="Lista Asignada", descripcion="D")
        other_list = ListaPrecios.objects.create(nombre="Lista Libre", descripcion="D")
        self._create_client('20111111111', 'Cliente Uno', assigned_list)
        self._create_client('20222222222', 'Cliente Dos', assigned_list)
        self._create_client('20333333333', 'Cliente Tres', None)

        assert self.repository.count_assigned_clients(assigned_list) == 2
        assert self.repository.count_assigned_clients(other_list) == 0

    def test_get_missing_client_ids(self):
        client = self._create_client('20444444444', 'Cliente Existente', None)

        assert self.repository.get_missing_client_ids([client.id]) == []
        assert self.repository.get_missing_client_ids([client.id, 9998, 9999]) == [9998, 9999]

    def test_assign_to_clients_moves_clients_from_other_list(self):
        new_list = ListaPrecios.objects.create(nombre="Lista Nueva", descripcion="D")
        old_list = ListaPrecios.objects.create(nombre="Lista Vieja", descripcion="D")
        client_with_old_list = self._create_client('20555555555', 'Cliente Con Lista', old_list)
        client_without_list = self._create_client('20666666666', 'Cliente Sin Lista', None)
        untouched_client = self._create_client('20777777777', 'Cliente No Elegido', old_list)

        assigned = self.repository.assign_to_clients(new_list, [client_with_old_list.id, client_without_list.id])

        assert assigned == 2
        client_with_old_list.refresh_from_db()
        client_without_list.refresh_from_db()
        untouched_client.refresh_from_db()
        assert client_with_old_list.lista_precios_id == new_list.id
        assert client_without_list.lista_precios_id == new_list.id
        assert untouched_client.lista_precios_id == old_list.id

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

        category, _ = Categoria.objects.get_or_create(descripcion='Frutas')
        container_type, _ = TipoContenedor.objects.get_or_create(descripcion='Cajón')
        unit_type, _ = TipoUnidad.objects.get_or_create(descripcion='Kilogramo', defaults={'tipo_medicion': 'PESO'})
        bulk_sale_type, _ = TipoVenta.objects.get_or_create(descripcion='Bulto')
        unit_sale_type, _ = TipoVenta.objects.get_or_create(descripcion='Unidad')

        product_1 = Producto.objects.create(
            descripcion='Manzana Dup',
            categoria=category,
            tipo_contenedor=container_type,
            tipo_unidad=unit_type,
            peso_aproximado=18,
        )

        product_2 = Producto.objects.create(
            descripcion='Banana Dup',
            categoria=category,
            tipo_contenedor=container_type,
            tipo_unidad=unit_type,
            peso_aproximado=20,
        )

        original_list = ListaPrecios.objects.create(
            nombre='Lista Original',
            descripcion='Descripción de prueba'
        )

        # Un registro por producto y tipo de venta (Bulto y Unidad), como se cargan desde la app.
        for product, bulk_price, unit_price in [(product_1, 80000, 4700), (product_2, 29000, 1600)]:
            ListaPreciosProducto.objects.create(
                lista_precios=original_list, producto=product, tipo_venta=bulk_sale_type, precio=bulk_price
            )
            ListaPreciosProducto.objects.create(
                lista_precios=original_list, producto=product, tipo_venta=unit_sale_type, precio=unit_price
            )

        new_list = self.repository.duplicate_prices_list(original_list)

        # Verificaciones
        assert new_list is not None
        assert new_list.nombre == 'Copia De Lista Original'
        assert new_list.descripcion == 'Descripción de prueba'
        assert new_list.id != original_list.id

        # Verificar que se copiaron los productos
        original_items = ListaPreciosProducto.objects.filter(lista_precios=original_list).count()
        new_items = ListaPreciosProducto.objects.filter(lista_precios=new_list).count()
        assert original_items == new_items == 4

        # Verificar que los precios se copiaron correctamente, por producto y tipo de venta
        for original_item in ListaPreciosProducto.objects.filter(lista_precios=original_list):
            new_item = ListaPreciosProducto.objects.get(
                lista_precios=new_list,
                producto=original_item.producto,
                tipo_venta=original_item.tipo_venta,
            )
            assert new_item.precio == original_item.precio

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
        assert new_list.nombre == 'Copia De Lista Vacía'
        
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
        assert copy_1.nombre == 'Copia De Lista Test'

        # Segunda duplicación
        copy_2 = self.repository.duplicate_prices_list(original_list)
        assert copy_2.nombre == 'Copia De Lista Test (1)'

        # Tercera duplicación
        copy_3 = self.repository.duplicate_prices_list(original_list)
        assert copy_3.nombre == 'Copia De Lista Test (2)'

