from rest_framework import serializers
from .models import TipoCondicionIva

class TypeConditionIvaSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoCondicionIva
        fields = ['id', 'descripcion']