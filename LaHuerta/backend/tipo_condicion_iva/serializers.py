from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import TipoCondicionIva

class ConditionIvaTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCondicionIva
        fields = ['id', 'descripcion', 'codigo_afip', 'is_system']
        read_only_fields = ['is_system']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=TipoCondicionIva.objects.all(), message='Ya existe una condición de IVA con esa descripción.')],
            },
        }
