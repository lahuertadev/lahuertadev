from rest_framework import serializers
from .models import TipoContenedor

class ContainerTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoContenedor
        fields = ['id', 'descripcion']