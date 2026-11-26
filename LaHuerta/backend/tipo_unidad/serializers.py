from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import TipoUnidad

class UnitTypeSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoUnidad
        fields = ['id', 'descripcion', 'abreviacion', 'tipo_medicion', 'is_system']
        read_only_fields = ['is_system']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=TipoUnidad.objects.all(), message='Ya existe un tipo de unidad con esa descripción.')],
            },
            'abreviacion': {
                'required': True,
                'validators': [UniqueValidator(queryset=TipoUnidad.objects.all(), lookup='iexact', message='Ya existe un tipo de unidad con esa abreviatura.')],
            },
        }
