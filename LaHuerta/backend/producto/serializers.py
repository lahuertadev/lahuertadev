from rest_framework import serializers
from .models import Producto
from categoria.serializers import CategorySerializer
from tipo_contenedor.serializers import ContainerTypeSerializer
from tipo_unidad.serializers import UnitTypeSerializer

class ProductSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    categoria = CategorySerializer()
    tipo_contenedor = ContainerTypeSerializer()
    tipo_unidad = UnitTypeSerializer()

    class Meta:
        model = Producto
        fields = [
            'id', 
            'descripcion',
            'categoria',
            'tipo_contenedor',
            'tipo_unidad',
            'cantidad_por_bulto',
            'peso_aproximado'
        ]

class ProductQueryParamsSerializer(serializers.Serializer):
    description = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    container_type = serializers.CharField(required=False)
