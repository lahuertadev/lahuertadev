from rest_framework import serializers
from .models import Pago
from cliente.serializers import ClientSerializer
from tipo_pago.serializers import PaymentTypeSerializer

class PaymentSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    cliente = ClientSerializer()
    tipo_pago = PaymentTypeSerializer()

    class Meta:
        model = Pago
        fields = [
            'id', 
            'fecha_pago',
            'importe',
            'observaciones',
            'cliente',
            'tipo_pago',
        ]