from rest_framework import serializers
from .models import DiaEntrega

class DeliveryDaysSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = DiaEntrega
        fields = ['id', 'descripcion']