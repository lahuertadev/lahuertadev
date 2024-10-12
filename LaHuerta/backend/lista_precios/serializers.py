from rest_framework import serializers
from .models import ListaPrecios

class PricesListSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''

    class Meta:
        model = ListaPrecios
        fields = [
            'id', 
            'nombre',
            'fecha_actualizacion',
            'descripcion',
        ]