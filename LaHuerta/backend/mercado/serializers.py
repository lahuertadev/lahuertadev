from rest_framework import serializers
from .models import Mercado
from .exceptions import MarketDescriptionAlreadyExistsException


class MarketCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de mercados.
    '''
    class Meta:
        model = Mercado
        fields = ['descripcion']

    def validate_descripcion(self, value):
        if Mercado.objects.filter(descripcion=value).exists():
            raise MarketDescriptionAlreadyExistsException('La descripción ya se encuentra registrada.')
        return value


class MarketUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de mercados.
    '''
    class Meta:
        model = Mercado
        fields = ['descripcion']

    def validate_descripcion(self, value):
        instance = self.instance
        if Mercado.objects.filter(descripcion=value).exclude(id=instance.id).exists():
            raise MarketDescriptionAlreadyExistsException('La descripción ya se encuentra registrada.')
        return value


class MarketSerializer(serializers.ModelSerializer):
    '''
    DTO de respuesta del mercado.
    '''
    class Meta:
        model = Mercado
        fields = ['id', 'descripcion']
