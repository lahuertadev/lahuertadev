import pytest
from django.db import IntegrityError

from tipo_unidad.models import TipoUnidad
from tipo_unidad.repositories import UnitTypeRepository


@pytest.mark.django_db
class TestUnitTypeRepository:
    def setup_method(self):
        self.repository = UnitTypeRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_unit_types_returns_list(self):
        TipoUnidad.objects.create(descripcion="Kilo")
        TipoUnidad.objects.create(descripcion="Gramo")

        result = self.repository.get_all_unit_types()

        assert result.count() == 2

    def test_get_all_unit_types_empty(self):
        result = self.repository.get_all_unit_types()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_unit_type_by_id_ok(self):
        item = TipoUnidad.objects.create(descripcion="Unidad")

        result = self.repository.get_unit_type_by_id(item.id)

        assert result is not None
        assert result.id == item.id
        assert result.descripcion == "Unidad"

    def test_get_unit_type_by_id_not_found_returns_none(self):
        result = self.repository.get_unit_type_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_unit_type_ok(self):
        result = self.repository.create_unit_type({"descripcion": "Docena"})

        assert result.id is not None
        assert result.descripcion == "Docena"
        assert TipoUnidad.objects.count() == 1

    def test_create_unit_type_duplicate_description_raises(self):
        TipoUnidad.objects.create(descripcion="Kilo")
        with pytest.raises(IntegrityError):
            self.repository.create_unit_type({"descripcion": "Kilo"})

    # ------------------------- UPDATE --------------------------
    def test_modify_unit_type_ok(self):
        item = TipoUnidad.objects.create(descripcion="Old")

        updated = self.repository.modify_unit_type(item, {"descripcion": "New"})

        assert updated.descripcion == "New"
        item.refresh_from_db()
        assert item.descripcion == "New"

    # ------------------------- DELETE --------------------------
    def test_destroy_unit_type_ok(self):
        item = TipoUnidad.objects.create(descripcion="Eliminar")

        self.repository.destroy_unit_type(item)

        assert TipoUnidad.objects.count() == 0

