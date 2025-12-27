from rest_framework import serializers
from .models import Producto
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad
from categoria.serializers import CategorySerializer
from tipo_contenedor.serializers import ContainerTypeSerializer
from tipo_unidad.serializers import UnitTypeSerializerResponse

class ProductSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    categoria = CategorySerializer()
    tipo_contenedor = ContainerTypeSerializer()
    tipo_unidad = UnitTypeSerializerResponse()

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

class ProductCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de nuevos productos
    '''

    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all())
    tipo_contenedor = serializers.PrimaryKeyRelatedField(queryset=TipoContenedor.objects.all())
    tipo_unidad = serializers.PrimaryKeyRelatedField(queryset=TipoUnidad.objects.all())

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

class ProductUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para actualizaciones parciales de productos
    '''

    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all(), required=False)
    tipo_contenedor = serializers.PrimaryKeyRelatedField(queryset=TipoContenedor.objects.all(), required=False)
    tipo_unidad = serializers.PrimaryKeyRelatedField(queryset=TipoUnidad.objects.all(), required=False)

    class Meta:
        model = Producto
        fields = [
            'descripcion',
            'categoria',
            'tipo_contenedor',
            'tipo_unidad',
            'cantidad_por_bulto',
            'peso_aproximado'
        ]

        #* Hace que los datos no sean requeridos ya que es una actualización. 
        extra_kwargs = {
            'descripcion': {'required': False},
            'cantidad_por_bulto': {'required': False},
            'peso_aproximado': {'required': False},
        }
