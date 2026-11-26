from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Mercado


class MarketCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de mercados.
    '''
    class Meta:
        model = Mercado
        fields = ['descripcion']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=Mercado.objects.all(), message='Ya existe un mercado con esa descripción.')],
            },
        }


class MarketUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de mercados.
    '''
    class Meta:
        model = Mercado
        fields = ['descripcion']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=Mercado.objects.all(), message='Ya existe un mercado con esa descripción.')],
            },
        }


class MarketSerializer(serializers.ModelSerializer):
    '''
    DTO de respuesta del mercado.
    '''
    class Meta:
        model = Mercado
        fields = ['id', 'descripcion']
