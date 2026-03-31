from decimal import Decimal
from rest_framework import serializers
from .models import PagoCliente
from cliente.models import Cliente
from tipo_pago.models import TipoPago
from banco.models import Banco
from cliente.serializers import ClientResponseSerializer
from tipo_pago.serializers import PaymentTypeSerializer


class ClientPaymentSerializer(serializers.Serializer):
    '''
    DTO para Create, Update y Partial Update de pagos de clientes.
    '''
    fecha_pago = serializers.DateField()
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    observaciones = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    tipo_pago = serializers.PrimaryKeyRelatedField(queryset=TipoPago.objects.all())

    # Campos de cheque — obligatorios solo cuando tipo_pago es "Cheque"
    cheque_numero = serializers.IntegerField(required=False, allow_null=True)
    cheque_banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all(), required=False, allow_null=True)
    cheque_fecha_emision = serializers.DateField(required=False, allow_null=True)
    cheque_fecha_deposito = serializers.DateField(required=False, allow_null=True)

    def validate(self, data):
        tipo_pago = data.get('tipo_pago')
        if tipo_pago and tipo_pago.descripcion == 'Cheque':
            errors = {}
            if not data.get('cheque_numero'):
                errors['cheque_numero'] = 'Requerido cuando el tipo de pago es cheque.'
            if not data.get('cheque_banco'):
                errors['cheque_banco'] = 'Requerido cuando el tipo de pago es cheque.'
            if not data.get('cheque_fecha_emision'):
                errors['cheque_fecha_emision'] = 'Requerido cuando el tipo de pago es cheque.'
            if errors:
                raise serializers.ValidationError(errors)
        return data


class ClientPaymentResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: pago con cliente, tipo de pago y cheque asociado si existe.
    '''
    cliente = ClientResponseSerializer()
    tipo_pago = PaymentTypeSerializer()
    cheque = serializers.SerializerMethodField()

    def get_cheque(self, obj):
        check = obj.cheque_set.first()
        if not check:
            return None
        return {
            'numero': check.numero,
            'banco': check.banco.id,
            'fecha_emision': check.fecha_emision,
            'fecha_deposito': check.fecha_deposito,
        }

    class Meta:
        model = PagoCliente
        fields = ['id', 'fecha_pago', 'importe', 'observaciones', 'cliente', 'tipo_pago', 'cheque']


class ClientPaymentQueryParamsSerializer(serializers.Serializer):
    client_id = serializers.IntegerField(required=False)
