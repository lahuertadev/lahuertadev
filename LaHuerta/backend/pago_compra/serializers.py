from decimal import Decimal
from rest_framework import serializers
from .models import PagoCompra
from compra.models import Compra
from tipo_pago.models import TipoPago
from tipo_pago.serializers import PaymentTypeSerializer


class CompraResumenSerializer(serializers.ModelSerializer):
    proveedor = serializers.CharField(source='proveedor.nombre')

    class Meta:
        model = Compra
        fields = ['id', 'fecha', 'proveedor']


class PurchasePaymentWriteSerializer(serializers.Serializer):
    compra = serializers.PrimaryKeyRelatedField(queryset=Compra.objects.all())
    importe_abonado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    tipo_pago = serializers.PrimaryKeyRelatedField(queryset=TipoPago.objects.all())
    fecha_pago = serializers.DateField()
    cheque_numero = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        if data.get('tipo_pago') and data['tipo_pago'].descripcion == 'Cheque':
            if not data.get('cheque_numero'):
                raise serializers.ValidationError(
                    {'cheque_numero': 'Requerido cuando el tipo de pago es cheque.'}
                )
        return data


class PurchasePaymentResponseSerializer(serializers.ModelSerializer):
    compra = CompraResumenSerializer()
    tipo_pago = PaymentTypeSerializer()
    cheque = serializers.SerializerMethodField()

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

    class Meta:
        model = PagoCompra
        fields = ['id', 'compra', 'importe_abonado', 'tipo_pago', 'fecha_pago', 'estado_pago', 'cheque']


class PurchasePaymentQueryParamsSerializer(serializers.Serializer):
    compra_id = serializers.IntegerField(required=False)
