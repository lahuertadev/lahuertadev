import pytest
from django.db import IntegrityError

from lista_precios.models import ListaPrecios
from lista_precios.repositories import PricesListRepository


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

    # ------------------------- DELETE --------------------------
    def test_destroy_prices_list_ok(self):
        item = ListaPrecios.objects.create(nombre="Eliminar", descripcion="Desc")

        self.repository.destroy_prices_list(item)

        assert ListaPrecios.objects.count() == 0

