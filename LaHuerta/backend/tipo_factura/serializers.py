from rest_framework import serializers
from .models import TipoFactura

class BillTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoFactura
        fields = ['id', 'descripcion', 'abreviatura', 'is_system']
        read_only_fields = ['is_system']