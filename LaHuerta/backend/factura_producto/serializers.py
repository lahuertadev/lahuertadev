from rest_framework import serializers
from .models import FacturaProducto
from producto.models import Producto
from producto.serializers import ProductSerializer
from tipo_venta.models import TipoVenta
from tipo_venta.serializers import SaleTypeSerializer


class BillItemResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura para los ítems de una factura.
    '''
    producto = ProductSerializer()
    tipo_venta = SaleTypeSerializer()

    class Meta:
        model = FacturaProducto
        fields = ['id', 'producto', 'tipo_venta', 'cantidad', 'precio_aplicado']


class BillItemCreateSerializer(serializers.Serializer):
    '''
    DTO de escritura para crear ítems de una factura.
    Recibe producto, tipo_venta y cantidad.
    El precio_aplicado se resuelve en el service a partir de la lista del cliente.
    '''
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all())
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
