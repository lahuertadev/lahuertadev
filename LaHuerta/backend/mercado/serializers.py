from rest_framework import serializers
from .models import Mercado

class MarketSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = Mercado
        fields = ['id', 'descripcion']