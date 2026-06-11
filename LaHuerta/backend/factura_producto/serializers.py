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
        fields = ['id', 'producto', 'tipo_venta', 'cantidad', 'precio_aplicado', 'iva_rate']


class BillItemCreateSerializer(serializers.Serializer):
    '''
    DTO de escritura para crear ítems de una factura.
    Para facturas normales, precio_aplicado se resuelve en el service desde la lista del cliente.
    Para ND/NC, precio_aplicado viene del frontend y se usa directamente.
    iva_rate es la alícuota de IVA del ítem (default 10.5). Solo aplica para comprobantes electrónicos.
    '''
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all())
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    precio_aplicado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, allow_null=True)
    iva_rate = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, required=False)
