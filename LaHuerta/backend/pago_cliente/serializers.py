from decimal import Decimal
from rest_framework import serializers
from .models import PagoCliente
from .constants import PaymentState
from cliente.models import Cliente
from tipo_pago.models import TipoPago
from tipo_pago import constants as payment_types
from banco.models import Banco
from cheque.models import Cheque
from cliente.serializers import ClientResponseSerializer
from tipo_pago.serializers import PaymentTypeSerializer


class ClientPaymentCheckSerializer(serializers.Serializer):
    '''
    Un cheque del pago. id solo al editar: identifica el cheque que ya tiene el pago.
    '''
    id = serializers.IntegerField(required=False)
    numero = serializers.IntegerField()
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    fecha_emision = serializers.DateField()
    fecha_deposito = serializers.DateField(required=False, allow_null=True)


class ClientPaymentSerializer(serializers.Serializer):
    '''
    DTO para Create, Update y Partial Update de pagos de clientes. Un pago con Cheque lleva uno o
    más cheques y su importe es la suma de ellos; con otro tipo de pago, no lleva cheques.
    '''
    fecha_pago = serializers.DateField()
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False)
    observaciones = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    tipo_pago = serializers.PrimaryKeyRelatedField(queryset=TipoPago.objects.all())
    cheques = ClientPaymentCheckSerializer(many=True, required=False)

    def validate(self, data):
        payment_type = data.get('tipo_pago')
        if not payment_type:
            return data

        checks = data.get('cheques') or []
        if payment_type.descripcion == payment_types.CHEQUE:
            if not checks:
                raise serializers.ValidationError({'cheques': 'Cargá al menos un cheque.'})
            keys = [(check['numero'], check['banco'].id) for check in checks]
            if len(set(keys)) != len(keys):
                raise serializers.ValidationError({'cheques': 'Un cheque no puede estar dos veces en el mismo pago.'})
            data['importe'] = sum((check['importe'] for check in checks), Decimal('0'))
            return data

        if checks:
            raise serializers.ValidationError(
                {'cheques': f'Un pago con {payment_type.descripcion} no lleva cheques.'}
            )
        if 'importe' not in data and not self.partial:
            raise serializers.ValidationError({'importe': 'Este campo es requerido.'})
        return data


class ClientPaymentCancelSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=200)


class ClientPaymentCheckResponseSerializer(serializers.ModelSerializer):
    banco_descripcion = serializers.CharField(source='banco.descripcion')
    estado = serializers.CharField(source='estado.descripcion', default=None)

    class Meta:
        model = Cheque
        fields = [
            'id', 'numero', 'importe', 'banco', 'banco_descripcion', 'fecha_emision', 'fecha_deposito',
            'endosado', 'estado',
        ]


class ClientPaymentResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: pago con cliente, tipo de pago y sus cheques.
    '''
    cliente = ClientResponseSerializer()
    tipo_pago = PaymentTypeSerializer()
    cheques = ClientPaymentCheckResponseSerializer(source='cheque_set', many=True, read_only=True)

    class Meta:
        model = PagoCliente
        fields = [
            'id', 'fecha_pago', 'importe', 'observaciones', 'cliente', 'tipo_pago',
            'estado_pago', 'fecha_anulacion', 'motivo_anulacion', 'cheques',
        ]


class ClientPaymentQueryParamsSerializer(serializers.Serializer):
    client_id = serializers.IntegerField(required=False)
    business_name = serializers.CharField(required=False)
    amount_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    amount_max = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    payment_type_id = serializers.IntegerField(required=False)
    state = serializers.ChoiceField(choices=PaymentState.choices, required=False)
