from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Banco


class BankCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de bancos.
    '''
    class Meta:
        model = Banco
        fields = ['descripcion']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=Banco.objects.all(), message='Ya existe un banco con esa descripción.')],
            },
        }


class BankUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de bancos.
    '''
    class Meta:
        model = Banco
        fields = ['descripcion']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=Banco.objects.all(), message='Ya existe un banco con esa descripción.')],
            },
        }


class BankSerializer(serializers.ModelSerializer):
    '''
    DTO de respuesta del banco.
    '''
    class Meta:
        model = Banco
        fields = ['id', 'descripcion']