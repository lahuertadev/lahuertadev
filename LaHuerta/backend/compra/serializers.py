from rest_framework import serializers
from .models import Compra
from .service import BuyService
from proveedor.models import Proveedor
from proveedor.serializers import SupplierSerializer
from compra_producto.serializers import BuyItemResponseSerializer, BuyItemCreateSerializer
from compra_vacio.serializers import BuyEmptyResponseSerializer, BuyEmptyCreateSerializer


def validate_unique_products(items):
    seen = set()
    duplicated = set()

    for item in items:
        product = item['producto']
        product_id = product.id

        if product_id in seen:
            duplicated.add(product.descripcion)

        seen.add(product_id)

    if duplicated:
        duplicated_list = ', '.join(sorted(duplicated))
        raise serializers.ValidationError(
            f'No se puede agregar el mismo producto más de una vez en la compra. '
            f'Productos duplicados: {duplicated_list}.'
        )


class BuyResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: compra con proveedor, ítems y estado de pago.
    '''
    proveedor = SupplierSerializer()
    items = BuyItemResponseSerializer(many=True, source='compraproducto_set')
    vacios = BuyEmptyResponseSerializer(many=True)
    payment_status = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    def get_payment_status(self, obj):
        return BuyService.calculate_payment_status(obj)

    def get_outstanding_balance(self, obj):
        return BuyService.calculate_outstanding_balance(obj)

    class Meta:
        model = Compra
        fields = ['id', 'fecha', 'importe', 'senia', 'proveedor', 'items', 'vacios', 'payment_status', 'outstanding_balance']


class BuyCreateSerializer(serializers.Serializer):
    '''
    DTO para crear una compra (POST).
    El importe se calcula automáticamente: Σ(cantidad_producto × precio_bulto) - senia.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    fecha = serializers.DateField()
    senia = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, default=0)
    items = BuyItemCreateSerializer(many=True)
    vacios = BuyEmptyCreateSerializer(many=True, required=False, default=list)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('La compra debe tener al menos un producto.')

        validate_unique_products(items)
        return items


class BuyUpdateSerializer(serializers.Serializer):
    '''
    DTO para editar una compra (PUT / PATCH).
    Si se envían ítems se reemplazan completamente y se recalcula el importe.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all(), required=False)
    fecha = serializers.DateField(required=False)
    senia = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    items = BuyItemCreateSerializer(many=True, required=False)
    vacios = BuyEmptyCreateSerializer(many=True, required=False)

    def validate_items(self, items):
        if items is not None and len(items) == 0:
            raise serializers.ValidationError('La compra debe tener al menos un producto.')

        validate_unique_products(items)
        return items


class BuyQueryParamsSerializer(serializers.Serializer):
    proveedor_id = serializers.IntegerField(required=False)
    fecha_desde  = serializers.DateField(required=False)
    fecha_hasta  = serializers.DateField(required=False)
    importe_min  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    importe_max  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
