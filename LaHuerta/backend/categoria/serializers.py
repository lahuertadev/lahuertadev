from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Categoria

class CategorySerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = Categoria
        fields = ['id', 'descripcion', 'is_system']
        read_only_fields = ['is_system']
        extra_kwargs = {
            'descripcion': {
                'validators': [UniqueValidator(queryset=Categoria.objects.all(), message='Ya existe una categoría con esa descripción.')],
            },
        }
