from rest_framework import serializers
from .models import Localidad

class TownSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = Localidad
        fields = ['id', 'descripcion']