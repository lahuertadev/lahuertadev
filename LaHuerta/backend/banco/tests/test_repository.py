import pytest
from django.db import IntegrityError

from banco.models import Banco
from banco.repositories import BankRepository


@pytest.mark.django_db
class TestBankRepository:
    def setup_method(self):
        self.repository = BankRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_banks_returns_list(self):
        Banco.objects.create(descripcion="Banco Nación")
        Banco.objects.create(descripcion="Banco Galicia")

        result = self.repository.get_all_banks()

        assert result.count() == 2

    def test_get_all_banks_empty(self):
        result = self.repository.get_all_banks()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_bank_by_id_ok(self):
        item = Banco.objects.create(descripcion="Banco Nación")

        result = self.repository.get_bank_by_id(item.id)

        assert result is not None
        assert result.id == item.id
        assert result.descripcion == "Banco Nación"

    def test_get_bank_by_id_not_found_returns_none(self):
        result = self.repository.get_bank_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_bank_ok(self):
        result = self.repository.create_bank({"descripcion": "Banco Galicia"})

        assert result.id is not None
        assert result.descripcion == "Banco Galicia"
        assert Banco.objects.count() == 1

    def test_create_bank_duplicate_descripcion_raises(self):
        Banco.objects.create(descripcion="Banco Nación")
        with pytest.raises(IntegrityError):
            self.repository.create_bank({"descripcion": "Banco Nación"})

    # ------------------------- UPDATE --------------------------
    def test_modify_bank_ok(self):
        item = Banco.objects.create(descripcion="Old")

        updated = self.repository.modify_bank(item, {"descripcion": "New"})

        assert updated.descripcion == "New"
        item.refresh_from_db()
        assert item.descripcion == "New"

    # ------------------------- DELETE --------------------------
    def test_delete_bank_ok(self):
        item = Banco.objects.create(descripcion="Eliminar")

        self.repository.delete_bank(item)

        assert Banco.objects.count() == 0
