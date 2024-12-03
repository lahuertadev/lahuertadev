from rest_framework import serializers
from .models import Municipio
from provincia.serializers import ProvinceSerializer

class CitySerializer(serializers.ModelSerializer):

    provincia = ProvinceSerializer()

    class Meta:
        model = Municipio
        fields = [
            'id',
            'nombre',
            'provincia'
        ]