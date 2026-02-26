from rest_framework import serializers
from .models import FacturaProducto
from producto.models import Producto
from producto.serializers import ProductSerializer


class BillItemResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura para los ítems de una factura.
    '''
    producto = ProductSerializer()

    class Meta:
        model = FacturaProducto
        fields = ['id', 'producto', 'cantidad_producto', 'precio_unitario', 'precio_bulto']


class BillItemCreateSerializer(serializers.Serializer):
    '''
    DTO de escritura para crear ítems de una factura.
    Recibe el id del producto y los datos de cantidad y precio.
    '''
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    cantidad_producto = serializers.FloatField(min_value=0)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=0)
    precio_bulto = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=0, required=False, allow_null=True)
