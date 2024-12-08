from rest_framework import serializers
from .models import Municipio
from provincia.models import Provincia
from provincia.serializers import ProvinceResponseSerializer

class CitySerializer(serializers.ModelSerializer):
    
    provincia = serializers.PrimaryKeyRelatedField(queryset=Provincia.objects.all())

    class Meta:
        model = Municipio
        fields = [
            'id',
            'nombre',
            'provincia'
        ]

class CityResponseSerializer(serializers.ModelSerializer):

    provincia = ProvinceResponseSerializer()

    class Meta:
        model = Municipio
        fields = [
            'id',
            'nombre',
            'provincia'
        ]