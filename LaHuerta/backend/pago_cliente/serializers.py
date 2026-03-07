from decimal import Decimal
from rest_framework import serializers
from .models import PagoCliente
from cliente.models import Cliente
from tipo_pago.models import TipoPago
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


class ClientPaymentResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: pago con cliente y tipo de pago.
    '''
    cliente = ClientResponseSerializer()
    tipo_pago = PaymentTypeSerializer()

    class Meta:
        model = PagoCliente
        fields = ['id', 'fecha_pago', 'importe', 'observaciones', 'cliente', 'tipo_pago']


class ClientPaymentQueryParamsSerializer(serializers.Serializer):
    client_id = serializers.IntegerField(required=False)
