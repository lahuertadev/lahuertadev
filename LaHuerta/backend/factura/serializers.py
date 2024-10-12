from rest_framework import serializers
from .models import Factura
from cliente.serializers import ClientSerializer
from tipo_factura.serializers import BillTypeSerializer

class BillSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    cliente = ClientSerializer()
    tipo_factura = BillTypeSerializer()

    class Meta:
        model = Factura
        fields = [
            'id', 
            'fecha',
            'importe',
            'cliente',
            'tipo_factura',
        ]