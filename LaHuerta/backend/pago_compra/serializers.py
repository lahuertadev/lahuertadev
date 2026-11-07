from decimal import Decimal
from rest_framework import serializers
from .models import PagoCompra
from compra.models import Compra
from proveedor.models import Proveedor
from tipo_pago.models import TipoPago
from tipo_pago.serializers import PaymentTypeSerializer


class CompraResumenSerializer(serializers.ModelSerializer):
    proveedor = serializers.CharField(source='proveedor.nombre')

    class Meta:
        model = Compra
        fields = ['id', 'fecha', 'proveedor']


class SupplierSummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'puesto']


class PurchasePaymentWriteSerializer(serializers.Serializer):
    '''
    DTO de alta. Sin compra, el pago es a cuenta. La correspondencia entre la compra
    y el proveedor se valida en PurchasePaymentService.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    compra = serializers.PrimaryKeyRelatedField(queryset=Compra.objects.all(), required=False, allow_null=True)
    importe_abonado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    tipo_pago = serializers.PrimaryKeyRelatedField(queryset=TipoPago.objects.all())
    fecha_pago = serializers.DateField()
    cheque_id = serializers.IntegerField(required=False, allow_null=True)
    own_check_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        if data.get('tipo_pago') and data['tipo_pago'].descripcion == 'Cheque':
            if not data.get('cheque_id'):
                raise serializers.ValidationError(
                    {'cheque_id': 'Requerido cuando el tipo de pago es cheque.'}
                )
        if data.get('tipo_pago') and data['tipo_pago'].descripcion == 'Cheque Propio':
            if not data.get('own_check_id'):
                raise serializers.ValidationError(
                    {'own_check_id': 'Requerido cuando el tipo de pago es cheque propio.'}
                )
        return data


class PurchasePaymentUpdateSerializer(serializers.Serializer):
    '''
    DTO de edición: solo la fecha y el importe. El proveedor, la compra y el medio de
    pago no se cambian (para eso se elimina el pago y se carga de nuevo).
    '''
    importe_abonado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    fecha_pago = serializers.DateField()


class PurchasePaymentResponseSerializer(serializers.ModelSerializer):
    proveedor = SupplierSummarySerializer()
    compra = CompraResumenSerializer(allow_null=True)
    tipo_pago = PaymentTypeSerializer()
    cheque = serializers.SerializerMethodField()
    cheque_propio = serializers.SerializerMethodField()

    def get_cheque(self, obj):
        check = obj.cheque_set.first()
        if not check:
            return None
        return {
            'numero': check.numero,
            'importe': check.importe,
            'banco': check.banco.descripcion,
            'estado': check.estado.descripcion if check.estado else None,
        }

    def get_cheque_propio(self, obj):
        own_check = obj.cheque_propio
        if not own_check:
            return None
        return {
            'numero': own_check.numero,
            'importe': own_check.importe,
            'banco': own_check.banco.descripcion,
            'estado': own_check.estado,
        }

    class Meta:
        model = PagoCompra
        fields = ['id', 'proveedor', 'compra', 'importe_abonado', 'tipo_pago', 'fecha_pago', 'estado_pago', 'cheque', 'cheque_propio']


class PurchasePaymentQueryParamsSerializer(serializers.Serializer):
    compra_id = serializers.IntegerField(required=False)
    supplier_id = serializers.IntegerField(required=False)
