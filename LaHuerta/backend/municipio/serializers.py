from rest_framework import serializers
from .models import Municipio
from provincia.models import Provincia
from provincia.serializers import ProvinceSerializer

class CitySerializer(serializers.ModelSerializer):
    
    provincia = serializers.PrimaryKeyRelatedField(queryset=Provincia.objects.all())

    class Meta:
        model = Municipio
        fields = [
            'id',
            'nombre',
            'provincia'
        ]