from rest_framework import serializers
from .models import Pago
from cliente.serializers import ClientCreateUpdateSerializer
from tipo_pago.serializers import PaymentTypeSerializer

class PaymentSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    cliente = ClientCreateUpdateSerializer()
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