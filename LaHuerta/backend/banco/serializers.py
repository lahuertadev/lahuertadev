from rest_framework import serializers
from .models import Banco

class BankSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    class Meta:
        model = Banco
        fields = ['id', 'descripcion']