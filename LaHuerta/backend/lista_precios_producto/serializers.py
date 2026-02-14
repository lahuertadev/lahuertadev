from rest_framework import serializers
from .models import ListaPreciosProducto
from lista_precios.models import ListaPrecios
from producto.models import Producto
from producto.serializers import ProductSerializer


class PriceListProductSerializer(serializers.ModelSerializer):
    """
    DTO de lectura: devuelve producto con sus datos relacionados.
    """

    producto = ProductSerializer()

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "id",
            "lista_precios",
            "producto",
            "precio_unitario",
            "precio_bulto",
        ]


class PriceListProductCreateSerializer(serializers.ModelSerializer):
    """
    DTO de escritura: recibe IDs.
    """

    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all())
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "id",
            "lista_precios",
            "producto",
            "precio_unitario",
            "precio_bulto",
        ]


class PriceListProductPutSerializer(serializers.ModelSerializer):
    """
    DTO para PUT (actualización completa): requiere todos los campos.
    """

    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all())
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "lista_precios",
            "producto",
            "precio_unitario",
            "precio_bulto",
        ]


class PriceListProductUpdateSerializer(serializers.ModelSerializer):
    """
    DTO para PATCH (actualización parcial).
    """

    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all(), required=False)
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), required=False)

    class Meta:
        model = ListaPreciosProducto
        fields = [
            "lista_precios",
            "producto",
            "precio_unitario",
            "precio_bulto",
        ]

        extra_kwargs = {
            "precio_unitario": {"required": False},
            "precio_bulto": {"required": False},
        }

