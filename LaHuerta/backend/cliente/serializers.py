from rest_framework import serializers
from .models import Cliente
from localidad.serializers import TownSerializer
from tipo_facturacion.serializers import FacturationTypeSerializer
from tipo_condicion_iva.serializers import ConditionIvaTypeSerializer

class ClientSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    localidad = TownSerializer()
    tipo_facturacion = FacturationTypeSerializer()
    condicion_IVA = ConditionIvaTypeSerializer()

    class Meta:
        model = Cliente
        fields = [
            'id', 
            'cuit',
            'razon_social',
            'cuenta_corriente',
            'domicilio',
            'localidad',
            'tipo_facturacion',
            'condicion_IVA',
            'telefono',
            'fecha_inicio_ventas',
            'nombre_fantasia'
        ]