from rest_framework import serializers
from .models import TipoVenta


class SaleTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoVenta
        fields = ['id', 'descripcion']
