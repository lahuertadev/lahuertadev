import pytest
from django.db import IntegrityError

from categoria.models import Categoria
from categoria.repositories import CategoryRepository


@pytest.mark.django_db
class TestCategoryRepository:
    def setup_method(self):
        self.repository = CategoryRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_categories_returns_list(self):
        Categoria.objects.create(descripcion="Frutas")
        Categoria.objects.create(descripcion="Verduras")

        result = self.repository.get_all_categories()

        assert result.count() == 2

    def test_get_all_categories_empty(self):
        result = self.repository.get_all_categories()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_category_by_id_ok(self):
        item = Categoria.objects.create(descripcion="Lacteos")

        result = self.repository.get_category_by_id(item.id)

        assert result is not None
        assert result.id == item.id
        assert result.descripcion == "Lacteos"

    def test_get_category_by_id_not_found_returns_none(self):
        result = self.repository.get_category_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_category_ok(self):
        result = self.repository.create_category({"descripcion": "Congelados"})

        assert result.id is not None
        assert result.descripcion == "Congelados"
        assert Categoria.objects.count() == 1

    def test_create_category_duplicate_description_raises(self):
        Categoria.objects.create(descripcion="Frutas")
        with pytest.raises(IntegrityError):
            self.repository.create_category({"descripcion": "Frutas"})

    # ------------------------- UPDATE --------------------------
    def test_modify_category_ok(self):
        item = Categoria.objects.create(descripcion="Old")

        updated = self.repository.modify_category(item.id, {"descripcion": "New"})

        assert updated.descripcion == "New"
        item.refresh_from_db()
        assert item.descripcion == "New"

    # ------------------------- DELETE --------------------------
    def test_destroy_category_ok(self):
        item = Categoria.objects.create(descripcion="Eliminar")

        self.repository.destroy_category(item.id)

        assert Categoria.objects.count() == 0

