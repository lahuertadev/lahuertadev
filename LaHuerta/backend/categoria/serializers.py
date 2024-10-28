from rest_framework import serializers
from .models import Categoria

class CategorySerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = Categoria
        fields = ['id', 'descripcion']