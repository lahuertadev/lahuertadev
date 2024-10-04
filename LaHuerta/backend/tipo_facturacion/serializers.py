from rest_framework import serializers
from .models import TipoFacturacion

class TipoFacturacionSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoFacturacion
        fields = ['id', 'descripcion']