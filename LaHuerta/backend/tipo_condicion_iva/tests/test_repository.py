import pytest
from tipo_condicion_iva.repositories import ConditionIvaTypeRepository

@pytest.mark.django_db
def test_create_and_get_all():
    repo = ConditionIvaTypeRepository()
    repo.create({
        'descripcion':'RI'
        })

    items = repo.get_all()
    assert items.count() == 1

