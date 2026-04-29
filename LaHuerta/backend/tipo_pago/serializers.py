from rest_framework import serializers
from .models import TipoPago

class PaymentTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoPago
        fields = ['id', 'descripcion', 'is_system']
        read_only_fields = ['is_system']