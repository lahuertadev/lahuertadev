from rest_framework import serializers
from core.text import capitalize_words
from .models import ListaPrecios


class CapitalizedNameMixin:
    '''
    El nombre de la lista se guarda siempre con cada palabra en mayúscula
    (ej. "lista mayorista" -> "Lista Mayorista"), tanto al crear como al editar.
    '''

    def validate_nombre(self, value):
        return capitalize_words(value)

class PricesListSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''

    class Meta:
        model = ListaPrecios
        fields = [
            'id', 
            'nombre',
            'fecha_creacion',
            'fecha_actualizacion',
            'descripcion',
        ]


class PricesListCreateSerializer(CapitalizedNameMixin, serializers.ModelSerializer):
    """
    DTO para crear listas de precios
    """

    class Meta:
        model = ListaPrecios
        fields = [
            "id",
            "nombre",
            "descripcion",
        ]
        extra_kwargs = {
            "descripcion": {"required": False, "allow_blank": True},
        }


class PricesListPutSerializer(CapitalizedNameMixin, serializers.ModelSerializer):
    """
    DTO para PUT (actualización completa): requiere todos los campos.
    """

    class Meta:
        model = ListaPrecios
        fields = [
            "nombre",
            "descripcion",
        ]


class PricesListUpdateSerializer(CapitalizedNameMixin, serializers.ModelSerializer):
    """
    DTO para PATCH (actualización parcial)
    """

    class Meta:
        model = ListaPrecios
        fields = [
            "nombre",
            "descripcion",
        ]

        extra_kwargs = {
            "nombre": {"required": False},
            "descripcion": {"required": False},
        }

class AssignClientsSerializer(serializers.Serializer):
    """
    DTO para asignar la lista de precios a varios clientes de una vez.
    """
    client_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        error_messages={'empty': 'Seleccioná al menos un cliente.'},
    )
