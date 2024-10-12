from rest_framework import serializers
from .models import Compra
from proveedor.serializers import SupplierSerializer

class BuySerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    proveedor = SupplierSerializer()

    class Meta:
        model = Compra
        fields = [
            'id', 
            'fecha',
            'bultos',
            'importe',
            'senia',
            'proveedor',
        ]