from rest_framework import serializers
from .models import TipoContenedor

class ContainerTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoContenedor
        fields = [
            'id',
            'descripcion',
            'abreviacion',
            'requiere_vacio',
            'is_system',
        ]
        read_only_fields = ['is_system']