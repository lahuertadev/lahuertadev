from rest_framework import serializers
from .models import CompraVacio
from tipo_contenedor.models import TipoContenedor
from tipo_contenedor.serializers import ContainerTypeSerializer


class BuyEmptyResponseSerializer(serializers.ModelSerializer):
    tipo_contenedor = ContainerTypeSerializer()

    class Meta:
        model = CompraVacio
        fields = ['id', 'tipo_contenedor', 'cantidad', 'precio_unitario']


class BuyEmptyCreateSerializer(serializers.Serializer):
    tipo_contenedor = serializers.PrimaryKeyRelatedField(queryset=TipoContenedor.objects.all())
    cantidad = serializers.FloatField(min_value=0)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
