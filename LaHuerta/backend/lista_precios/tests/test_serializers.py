import pytest

from lista_precios.serializers import (
    PricesListCreateSerializer,
    PricesListPutSerializer,
    PricesListUpdateSerializer,
)


@pytest.mark.django_db
def test_create_serializer_capitalizes_name():
    serializer = PricesListCreateSerializer(data={'nombre': 'copia de lista minorista', 'descripcion': ''})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['nombre'] == 'Copia De Lista Minorista'


@pytest.mark.django_db
def test_put_serializer_capitalizes_name():
    serializer = PricesListPutSerializer(data={'nombre': 'LISTA MAYORISTA', 'descripcion': 'Desc'})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['nombre'] == 'Lista Mayorista'


@pytest.mark.django_db
def test_patch_serializer_capitalizes_name():
    serializer = PricesListUpdateSerializer(data={'nombre': 'lista  mayo'}, partial=True)
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['nombre'] == 'Lista Mayo'


@pytest.mark.django_db
def test_patch_serializer_without_name_does_not_add_it():
    serializer = PricesListUpdateSerializer(data={'descripcion': 'solo descripción'}, partial=True)
    assert serializer.is_valid(), serializer.errors
    assert 'nombre' not in serializer.validated_data
    assert serializer.validated_data['descripcion'] == 'solo descripción'
