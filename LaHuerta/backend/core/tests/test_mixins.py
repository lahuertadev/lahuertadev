from django.http import QueryDict
from rest_framework import serializers

from core.mixins import CapitalizedFieldsMixin


class _DummySerializer(CapitalizedFieldsMixin, serializers.Serializer):
    capitalized_fields = ('name', 'address')
    name = serializers.CharField()
    address = serializers.CharField(required=False, allow_null=True)
    notes = serializers.CharField(required=False)


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
