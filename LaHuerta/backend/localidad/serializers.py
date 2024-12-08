from rest_framework import serializers
from .models import Localidad
from municipio.models import Municipio
from municipio.serializers import CityResponseSerializer

class DistrictCreateUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de municipios
    '''
    municipio = serializers.PrimaryKeyRelatedField(queryset=Municipio.objects.all())

    class Meta:
        model = Localidad
        fields = [
            'id',
            'nombre',
            'municipio'
        ]

class DistrictResponseSerializer(serializers.ModelSerializer):
    '''
    DTO para mostrar la respuesta
    '''
    municipio = CityResponseSerializer()

    class Meta:
        model = Municipio
        fields = [
            'id',
            'nombre',
            'municipio'
        ]