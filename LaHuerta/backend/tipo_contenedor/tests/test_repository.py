import pytest
from django.db import IntegrityError

from tipo_contenedor.models import TipoContenedor
from tipo_contenedor.repositories import ContainerTypeRepository


@pytest.mark.django_db
class TestContainerTypeRepository:
    def setup_method(self):
        self.repository = ContainerTypeRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_container_types_returns_list(self):
        TipoContenedor.objects.create(descripcion="Cajon")
        TipoContenedor.objects.create(descripcion="Jaula")

        result = self.repository.get_all_container_types()

        assert result.count() == 2

    def test_get_all_container_types_empty(self):
        result = self.repository.get_all_container_types()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_container_by_id_ok(self):
        item = TipoContenedor.objects.create(descripcion="Bolsa")

        result = self.repository.get_container_by_id(item.id)

        assert result is not None
        assert result.id == item.id
        assert result.descripcion == "Bolsa"

    def test_get_container_by_id_not_found_returns_none(self):
        result = self.repository.get_container_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_container_type_ok(self):
        result = self.repository.create_container_type({"descripcion": "Pallet"})

        assert result.id is not None
        assert result.descripcion == "Pallet"
        assert TipoContenedor.objects.count() == 1

    def test_create_container_type_duplicate_description_raises(self):
        TipoContenedor.objects.create(descripcion="Cajon")
        with pytest.raises(IntegrityError):
            self.repository.create_container_type({"descripcion": "Cajon"})

    # ------------------------- UPDATE --------------------------
    def test_modify_container_type_ok(self):
        item = TipoContenedor.objects.create(descripcion="Old")

        updated = self.repository.modify_container_type(item, {"descripcion": "New"})

        assert updated.descripcion == "New"
        item.refresh_from_db()
        assert item.descripcion == "New"

    # ------------------------- DELETE --------------------------
    def test_destroy_container_type_ok(self):
        item = TipoContenedor.objects.create(descripcion="Eliminar")

        self.repository.destroy_container_type(item)

        assert TipoContenedor.objects.count() == 0

