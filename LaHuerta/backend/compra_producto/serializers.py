from rest_framework import serializers
from .models import CompraProducto
from producto.models import Producto
from producto.serializers import ProductSerializer
from tipo_venta.models import TipoVenta
from tipo_venta.serializers import SaleTypeSerializer


class BuyItemResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura para los ítems de una compra.
    '''
    producto = ProductSerializer()
    tipo_venta = SaleTypeSerializer()

    class Meta:
        model = CompraProducto
        fields = ['id', 'producto', 'tipo_venta', 'cantidad_producto', 'precio_bulto', 'precio_unitario']


class BuyItemCreateSerializer(serializers.Serializer):
    '''
    DTO de escritura para crear ítems de una compra.
    Los precios son ingresados manualmente por el usuario.
    '''
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all(), required=False, allow_null=True, default=None)
    cantidad_producto = serializers.FloatField(min_value=0)
    precio_bulto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
