from rest_framework import serializers
from .models import TipoGasto

class TipoGastoSerializer(serializers.ModelSerializer):
    '''
    Convierte los datos del modelo TipoGasto a un formato JSON (o viceversa)
    para que se puedan enviar o recibir a través de la API.
    '''
    class Meta:
        model = TipoGasto
        fields = ['id', 'descripcion']