from rest_framework import serializers
from .models import Cliente
from localidad.serializers import TownSerializer
from tipo_facturacion.serializers import FacturationTypeSerializer
from tipo_condicion_iva.serializers import ConditionIvaTypeSerializer
from dia_entrega.serializers import DeliveryDaysSerializer

class ClientSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    localidad = TownSerializer()
    tipo_facturacion = FacturationTypeSerializer()
    condicion_IVA = ConditionIvaTypeSerializer()
    dias_entrega = DeliveryDaysSerializer(many=True)

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
            'nombre_fantasia',
            'dias_entrega'
        ]

class ClientQueryParamsSerializer(serializers.Serializer):
    cuit = serializers.CharField(required=False, max_length=11, allow_blank=True, error_messages={
        'max_length': 'El cuit debe tener 11 números, sin caracteres especiales.',
        'invalid': 'El cuit debe tener 11 números, sin caracteres especiales.'
    })
    searchQuery = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

