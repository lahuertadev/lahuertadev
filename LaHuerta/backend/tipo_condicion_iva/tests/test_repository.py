import pytest

from django.core.exceptions import ObjectDoesNotExist
from tipo_condicion_iva.models import TipoCondicionIva
from tipo_condicion_iva.repositories import ConditionIvaTypeRepository

@pytest.mark.django_db
class TestConditionIvaTypeRepository:

    def setup_method(self):
        self.repository = ConditionIvaTypeRepository()

    #? ------------------------- GET ALL -------------------------
    def test_get_all_returns_list(self):
        TipoCondicionIva.objects.create(descripcion="RI")
        TipoCondicionIva.objects.create(descripcion="MT")

        result = self.repository.get_all()

        assert result.count() == 2

    def test_get_all_empty(self):
        result = self.repository.get_all()

        assert result.count() == 0

    #? ------------------------- GET BY ID -----------------------
    def test_get_by_id_ok(self):
        item = TipoCondicionIva.objects.create(descripcion="CF")

        result = self.repository.get_by_id(item.id)

        assert result.id == item.id
        assert result.descripcion == "CF"

    def test_get_by_id_not_found(self):
        with pytest.raises(ObjectDoesNotExist):
            self.repository.get_by_id(9999)

    #? ------------------------- CREATE --------------------------
    def test_create_ok(self):
        data = {"descripcion": "Exento"}

        result = self.repository.create(data)

        assert result.id is not None
        assert result.descripcion == "Exento"
        assert TipoCondicionIva.objects.count() == 1

    #? ------------------------- UPDATE --------------------------

    def test_update_ok(self):
        item = TipoCondicionIva.objects.create(descripcion="Old")

        updated = self.repository.update(
            item.id,
            {"descripcion": "New"}
        )

        assert updated.descripcion == "New"

        item.refresh_from_db()
        assert item.descripcion == "New"

    def test_update_not_found(self):
        with pytest.raises(ObjectDoesNotExist):
            self.repository.update(
                9999,
                {"descripcion": "No existe"}
            )

    #? ------------------------- DELETE --------------------------

    def test_delete_ok(self):
        item = TipoCondicionIva.objects.create(descripcion="Eliminar")

        result = self.repository.delete(item.id)

        assert result is True
        assert TipoCondicionIva.objects.count() == 0

    def test_delete_not_found(self):
        with pytest.raises(ObjectDoesNotExist):
            self.repository.delete(9999)
