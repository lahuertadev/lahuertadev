from rest_framework import serializers
from .models import Localidad
from municipio.models import Municipio
from municipio.serializers import CitySerializer

class DistrictSerializer(serializers.ModelSerializer):

    municipio = serializers.PrimaryKeyRelatedField(queryset=Municipio.objects.all())

    class Meta:
        model = Localidad
        fields = [
            'id',
            'nombre',
            'municipio'
        ]