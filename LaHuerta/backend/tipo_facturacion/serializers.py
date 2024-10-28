from rest_framework import serializers
from .models import TipoFacturacion

class FacturationTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoFacturacion
        fields = ['id', 'descripcion']