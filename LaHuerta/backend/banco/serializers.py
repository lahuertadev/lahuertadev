from rest_framework import serializers
from .models import Banco
from .exceptions import BankDescriptionAlreadyExistsException


class BankCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de bancos.
    '''
    class Meta:
        model = Banco
        fields = ['descripcion']

    def validate_descripcion(self, value):
        if Banco.objects.filter(descripcion=value).exists():
            raise BankDescriptionAlreadyExistsException('La descripción ya se encuentra registrada.')
        return value


class BankUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de bancos.
    '''
    class Meta:
        model = Banco
        fields = ['descripcion']

    def validate_descripcion(self, value):
        instance = self.instance
        if Banco.objects.filter(descripcion=value).exclude(id=instance.id).exists():
            raise BankDescriptionAlreadyExistsException('La descripción ya se encuentra registrada.')
        return value


class BankSerializer(serializers.ModelSerializer):
    '''
    DTO de respuesta del banco.
    '''
    class Meta:
        model = Banco
        fields = ['id', 'descripcion']