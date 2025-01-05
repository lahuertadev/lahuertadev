from rest_framework import serializers
from .models import TipoUnidad
from .exceptions import (
    UnitTypeAlreadyExistsException,
    UnitTypeHasProductsException,
    UnitTypeNotFoundException
)

class UnitTypeSerializerResponse(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = TipoUnidad
        fields = ['id', 'descripcion']
