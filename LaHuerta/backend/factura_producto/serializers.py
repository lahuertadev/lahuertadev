from rest_framework import serializers
from .models import FacturaProducto
from producto.models import Producto
from producto.serializers import ProductSerializer

from tipo_venta.models import TipoVenta

UNIT_SALE = 'unidad'
BULK_SALE = 'bulto'

class BillItemResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura para los ítems de una factura.
    '''
    producto = ProductSerializer()

    class Meta:
        model = FacturaProducto
        fields = ['id', 'producto', 'cantidad', 'precio_unitario', 'precio_bulto', 'tipo_venta']


class BillItemCreateSerializer(serializers.Serializer):
    '''
    DTO de escritura para crear ítems de una factura.
    Recibe el id del producto y los datos de cantidad y precio.
    '''
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    precio_bulto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True)
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all())

    def validate(self, attrs):
        sale_type = attrs.get('tipo_venta')
        price_unit = attrs.get('precio_unitario')
        price_bulk = attrs.get('precio_bulto')

        if sale_type.descripcion.lower() == UNIT_SALE and not price_unit:
            raise serializers.ValidationError('El precio unitario es requerido para ventas por unidad.')

        if sale_type.descripcion.lower() == BULK_SALE and not price_bulk:
            raise serializers.ValidationError('El precio bulto es requerido para ventas por bulto.')

        return attrs