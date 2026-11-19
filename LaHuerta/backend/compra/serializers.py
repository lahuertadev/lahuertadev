from rest_framework import serializers
from .models import Compra
from .service import BuyService
from proveedor.models import Proveedor
from proveedor.serializers import SupplierSerializer
from compra_producto.serializers import BuyItemResponseSerializer, BuyItemCreateSerializer
from cheque_propio.models import OwnCheck
from estado_cheque.constants import RECHAZADO


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
    payment_status = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    def get_payment_status(self, obj):
        return BuyService.calculate_payment_status(obj)

    def get_outstanding_balance(self, obj):
        return BuyService.calculate_outstanding_balance(obj)

    class Meta:
        model = Compra
        fields = ['id', 'fecha', 'importe', 'senia', 'proveedor', 'items', 'payment_status', 'outstanding_balance']


class BuyDetailResponseSerializer(BuyResponseSerializer):
    '''Detalle de la compra con sus pagos (también los anulados) y lo que le aplicó cada uno.'''
    payments = serializers.SerializerMethodField()

    def get_payments(self, obj):
        applications = sorted(
            obj.payment_applications.all(),
            key=lambda application: (application.pago_compra.fecha_pago, application.pago_compra.id),
        )
        return [
            {
                'id': application.pago_compra.id,
                'fecha_pago': application.pago_compra.fecha_pago,
                'tipo_pago': application.pago_compra.tipo_pago.descripcion,
                'importe_abonado': application.pago_compra.importe_abonado,
                'importe_aplicado': application.importe,
                'estado_pago': application.pago_compra.estado_pago,
                'fallen_check': self._fallen_check_state(application.pago_compra),
            }
            for application in applications
        ]

    @staticmethod
    def _fallen_check_state(payment):
        '''Estado del cheque que se cayó del pago (RECHAZADO o ANULADO), o None si no se cayó ninguno.'''
        client_states = {use.cheque.estado.descripcion for use in payment.client_check_uses.all()}
        own_states = {use.cheque_propio.estado for use in payment.own_check_uses.all()}
        if RECHAZADO in client_states or OwnCheck.State.RECHAZADO in own_states:
            return RECHAZADO
        if OwnCheck.State.ANULADO in own_states:
            return OwnCheck.State.ANULADO.value
        return None

    class Meta(BuyResponseSerializer.Meta):
        fields = [*BuyResponseSerializer.Meta.fields, 'payments']


class BuyCreateSerializer(serializers.Serializer):
    '''
    DTO para crear una compra (POST).
    El importe se calcula automáticamente: Σ(cantidad_producto × precio_bulto) - senia.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    fecha = serializers.DateField()
    senia = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False, default=0)
    items = BuyItemCreateSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('La compra debe tener al menos un producto.')

        validate_unique_products(items)
        return items


class BuyBulkCreateSerializer(serializers.Serializer):
    '''
    DTO para la carga masiva (POST /buy/bulk/): una fecha y varias compras.
    Cada compra se valida después por separado con BuyCreateSerializer,
    para poder informar los errores por compra sin rechazar las válidas.
    '''
    fecha = serializers.DateField()
    compras = serializers.ListField(child=serializers.DictField())

    def validate_compras(self, buys):
        if not buys:
            raise serializers.ValidationError('La carga debe tener al menos una compra.')

        supplier_ids = [buy.get('proveedor') for buy in buys if buy.get('proveedor')]
        if len(supplier_ids) != len(set(map(str, supplier_ids))):
            raise serializers.ValidationError('No se puede cargar más de una compra para el mismo proveedor.')

        return buys


class BuyUpdateSerializer(serializers.Serializer):
    '''
    DTO para editar una compra (PUT / PATCH).
    Si se envían ítems se reemplazan completamente y se recalcula el importe.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all(), required=False)
    fecha = serializers.DateField(required=False)
    senia = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    items = BuyItemCreateSerializer(many=True, required=False)

    def validate_items(self, items):
        if items is not None and len(items) == 0:
            raise serializers.ValidationError('La compra debe tener al menos un producto.')

        validate_unique_products(items)
        return items


class BuyQueryParamsSerializer(serializers.Serializer):
    proveedor_id = serializers.IntegerField(required=False)
    supplier     = serializers.CharField(required=False)
    fecha_desde  = serializers.DateField(required=False)
    fecha_hasta  = serializers.DateField(required=False)
    importe_min  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    importe_max  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
