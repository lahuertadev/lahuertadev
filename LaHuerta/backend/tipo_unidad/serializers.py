from rest_framework import serializers
from .models import TipoUnidad

class UnitTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoUnidad
        fields = ['id', 'descripcion']