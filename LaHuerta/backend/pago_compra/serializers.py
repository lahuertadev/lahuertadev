from decimal import Decimal
from rest_framework import serializers
from .models import PagoCompra
from compra.models import Compra
from proveedor.models import Proveedor
from tipo_pago.models import TipoPago
from tipo_pago.serializers import PaymentTypeSerializer
from .constants import PAYMENT_KIND_CHOICES, PAYMENT_TYPE_CHECK, PAYMENT_TYPE_OWN_CHECK


class CompraResumenSerializer(serializers.ModelSerializer):
    proveedor = serializers.CharField(source='proveedor.nombre')

    class Meta:
        model = Compra
        fields = ['id', 'fecha', 'proveedor']


class SupplierSummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'puesto']


class OwnCheckUseSerializer(serializers.Serializer):
    '''Un cheque emitido del pago y cuánto se usa de él.'''
    id = serializers.IntegerField()
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class PurchasePaymentWriteSerializer(serializers.Serializer):
    '''
    DTO de alta. Sin compra, el pago es a cuenta. La correspondencia entre la compra
    y el proveedor se valida en PurchasePaymentService.

    Un pago tiene un solo tipo de pago. Con cheques de clientes se mandan sus ids
    (cheque_ids) y con cheques emitidos cada cheque con su importe (own_checks); en los dos
    casos el importe del pago es la suma de los cheques. Con otro tipo, va importe_abonado.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    compra = serializers.PrimaryKeyRelatedField(queryset=Compra.objects.all(), required=False, allow_null=True)
    importe_abonado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False)
    tipo_pago = serializers.PrimaryKeyRelatedField(queryset=TipoPago.objects.all())
    fecha_pago = serializers.DateField()
    cheque_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    own_checks = OwnCheckUseSerializer(many=True, required=False)

    def validate(self, data):
        payment_type = data['tipo_pago'].descripcion
        # Un pago tiene un solo tipo de pago: no se mezclan cheques de clientes, cheques propios
        # ni otros medios. Si se paga con varios, se cargan pagos separados.
        if payment_type != PAYMENT_TYPE_CHECK and data.get('cheque_ids'):
            raise serializers.ValidationError(
                {'cheque_ids': f'Un pago con {payment_type} no lleva cheques de clientes. Cargá un pago por cada tipo de pago.'}
            )
        if payment_type != PAYMENT_TYPE_OWN_CHECK and data.get('own_checks'):
            raise serializers.ValidationError(
                {'own_checks': f'Un pago con {payment_type} no lleva cheques propios. Cargá un pago por cada tipo de pago.'}
            )
        if payment_type == PAYMENT_TYPE_CHECK:
            check_ids = data.get('cheque_ids') or []
            if not check_ids:
                raise serializers.ValidationError({'cheque_ids': 'Elegí al menos un cheque.'})
            if len(set(check_ids)) != len(check_ids):
                raise serializers.ValidationError({'cheque_ids': 'Un cheque no puede estar dos veces en el mismo pago.'})
        elif payment_type == PAYMENT_TYPE_OWN_CHECK:
            own_checks = data.get('own_checks') or []
            if not own_checks:
                raise serializers.ValidationError({'own_checks': 'Elegí al menos un cheque propio.'})
            own_check_ids = [item['id'] for item in own_checks]
            if len(set(own_check_ids)) != len(own_check_ids):
                raise serializers.ValidationError({'own_checks': 'Un cheque no puede estar dos veces en el mismo pago.'})
        elif not data.get('importe_abonado'):
            raise serializers.ValidationError({'importe_abonado': 'Este campo es requerido.'})
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
    cheques = serializers.SerializerMethodField()
    cheques_propios = serializers.SerializerMethodField()

    def get_cheques(self, obj):
        return [
            {
                'id': check.id,
                'numero': check.numero,
                'importe': check.importe,
                'banco': check.banco.descripcion,
                'estado': check.estado.descripcion if check.estado else None,
            }
            for check in obj.cheque_set.all()
        ]

    def get_cheques_propios(self, obj):
        return [
            {
                'id': use.cheque_propio.id,
                'numero': use.cheque_propio.numero,
                'importe': use.cheque_propio.importe,
                'importe_usado': use.importe,
                'banco': use.cheque_propio.banco.descripcion,
                'estado': use.cheque_propio.estado,
            }
            for use in obj.own_check_uses.all()
        ]

    class Meta:
        model = PagoCompra
        fields = ['id', 'proveedor', 'compra', 'importe_abonado', 'tipo_pago', 'fecha_pago', 'estado_pago', 'cheques', 'cheques_propios']


class PurchasePaymentQueryParamsSerializer(serializers.Serializer):
    compra_id = serializers.IntegerField(required=False)
    supplier_id = serializers.IntegerField(required=False)
    # Texto libre: busca por puesto (si es un número) o por nombre del proveedor.
    supplier = serializers.CharField(required=False, allow_blank=True)
    kind = serializers.ChoiceField(choices=PAYMENT_KIND_CHOICES, required=False)
    payment_type_id = serializers.IntegerField(required=False)
    amount_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    amount_max = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
