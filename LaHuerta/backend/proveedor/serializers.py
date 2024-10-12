from rest_framework import serializers
from .models import Proveedor
from mercado.serializers import MarketSerializer

class SupplierSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    mercado = MarketSerializer()

    class Meta:
        model = Proveedor
        fields = [
            'id', 
            'nombre',
            'puesto',
            'nave',
            'telefono',
            'cuenta_corriente',
            'nombre_fantasia',
            'mercado'
        ]