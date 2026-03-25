import pytest
from django.db import IntegrityError

from mercado.models import Mercado
from mercado.repositories import MarketRepository


@pytest.mark.django_db
class TestMarketRepository:
    def setup_method(self):
        self.repository = MarketRepository()

    # ------------------------- GET ALL -------------------------
    def test_get_all_markets_returns_list(self):
        Mercado.objects.create(descripcion="Belgrano")
        Mercado.objects.create(descripcion="Central")

        result = self.repository.get_all_markets()

        assert result.count() == 2

    def test_get_all_markets_empty(self):
        result = self.repository.get_all_markets()
        assert result.count() == 0

    # ------------------------- GET BY ID -----------------------
    def test_get_market_by_id_ok(self):
        item = Mercado.objects.create(descripcion="Belgrano")

        result = self.repository.get_market_by_id(item.id)

        assert result is not None
        assert result.id == item.id
        assert result.descripcion == "Belgrano"

    def test_get_market_by_id_not_found_returns_none(self):
        result = self.repository.get_market_by_id(9999)
        assert result is None

    # ------------------------- CREATE --------------------------
    def test_create_market_ok(self):
        result = self.repository.create_market({"descripcion": "Central"})

        assert result.id is not None
        assert result.descripcion == "Central"
        assert Mercado.objects.count() == 1

    def test_create_market_duplicate_descripcion_raises(self):
        Mercado.objects.create(descripcion="Belgrano")
        with pytest.raises(IntegrityError):
            self.repository.create_market({"descripcion": "Belgrano"})

    # ------------------------- UPDATE --------------------------
    def test_modify_market_ok(self):
        item = Mercado.objects.create(descripcion="Old")

        updated = self.repository.modify_market(item, {"descripcion": "New"})

        assert updated.descripcion == "New"
        item.refresh_from_db()
        assert item.descripcion == "New"

    # ------------------------- DELETE --------------------------
    def test_delete_market_ok(self):
        item = Mercado.objects.create(descripcion="Eliminar")

        self.repository.delete_market(item)

        assert Mercado.objects.count() == 0
