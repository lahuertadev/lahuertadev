from rest_framework import serializers
from .models import ListaPreciosProducto
from lista_precios.models import ListaPrecios
from producto.models import Producto
from tipo_venta.models import TipoVenta
from producto.serializers import ProductSerializer
from tipo_venta.serializers import SaleTypeSerializer


class PriceListProductSerializer(serializers.ModelSerializer):
    """
    DTO de lectura: devuelve producto con sus datos relacionados.
    """
    producto = ProductSerializer()
    tipo_venta = SaleTypeSerializer()

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "id",
            "lista_precios",
            "producto",
            "tipo_venta",
            "precio",
        ]


class PriceListProductCreateSerializer(serializers.ModelSerializer):
    """
    DTO de escritura: recibe IDs.
    """
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all())
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all())

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "id",
            "lista_precios",
            "producto",
            "tipo_venta",
            "precio",
        ]


class PriceListProductPutSerializer(serializers.ModelSerializer):
    """
    DTO para PUT (actualización completa): requiere todos los campos.
    """
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all())
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all())

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "lista_precios",
            "producto",
            "tipo_venta",
            "precio",
        ]


class PriceListProductUpdateSerializer(serializers.ModelSerializer):
    """
    DTO para PATCH (actualización parcial).
    """
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all(), required=False)
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), required=False)
    tipo_venta = serializers.PrimaryKeyRelatedField(queryset=TipoVenta.objects.all(), required=False)

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "lista_precios",
            "producto",
            "tipo_venta",
            "precio",
        ]

        extra_kwargs = {
            "precio": {"required": False},
        }
