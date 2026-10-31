from django.http import QueryDict
from rest_framework import serializers

from core.mixins import CapitalizedFieldsMixin


class _DummySerializer(CapitalizedFieldsMixin, serializers.Serializer):
    capitalized_fields = ('name', 'address')
    address_fields = ('delivery_address',)
    name = serializers.CharField()
    address = serializers.CharField(required=False, allow_null=True)
    notes = serializers.CharField(required=False)
    delivery_address = serializers.CharField(required=False, allow_null=True)


def test_capitalizes_only_listed_fields():
    serializer = _DummySerializer(data={'name': 'juan PEREZ', 'address': 'calle falsa 123', 'notes': 'una nota'})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data == {
        'name': 'Juan Perez',
        'address': 'Calle Falsa 123',
        'notes': 'una nota',
    }


def test_ignores_missing_and_null_fields():
    serializer = _DummySerializer(data={'name': 'ana', 'address': None})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['name'] == 'Ana'
    assert serializer.validated_data['address'] is None


def test_works_with_querydict():
    data = QueryDict(mutable=True)
    data.update({'name': 'maría josé'})
    serializer = _DummySerializer(data=data)
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['name'] == 'María José'


def test_address_fields_normalize_abbreviations():
    serializer = _DummySerializer(data={'name': 'dr juan', 'delivery_address': 'av corrientes 1234 pb'})
    assert serializer.is_valid(), serializer.errors
    # En los campos comunes la abreviatura no se toca; en los de dirección, sí.
    assert serializer.validated_data['name'] == 'Dr Juan'
    assert serializer.validated_data['delivery_address'] == 'Av. Corrientes 1234 PB'
