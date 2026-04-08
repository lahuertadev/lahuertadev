from rest_framework import serializers
from .models import ListaPrecios

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


class PricesListCreateSerializer(serializers.ModelSerializer):
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


class PricesListPutSerializer(serializers.ModelSerializer):
    """
    DTO para PUT (actualización completa): requiere todos los campos.
    """

    class Meta:
        model = ListaPrecios
        fields = [
            "nombre",
            "descripcion",
        ]


class PricesListUpdateSerializer(serializers.ModelSerializer):
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