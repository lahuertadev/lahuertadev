from rest_framework import serializers
from .models import Localidad
from municipio.serializers import CitySerializer

class DistrictSerializer(serializers.ModelSerializer):

    municipio = CitySerializer()

    class Meta:
        model = Localidad
        fields = [
            'id',
            'nombre',
            'municipio'
        ]