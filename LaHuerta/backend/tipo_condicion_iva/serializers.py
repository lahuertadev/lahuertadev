from rest_framework import serializers
from .models import TipoCondicionIva

class ConditionIvaTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoCondicionIva
        fields = ['id', 'descripcion']