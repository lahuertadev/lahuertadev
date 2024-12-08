from rest_framework import serializers
from .models import Cliente
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from localidad.models import Localidad
from localidad.serializers import DistrictResponseSerializer
from tipo_facturacion.serializers import FacturationTypeSerializer
from tipo_condicion_iva.serializers import ConditionIvaTypeSerializer

class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación o modificación de clientes.
    '''
    localidad = serializers.PrimaryKeyRelatedField(queryset=Localidad.objects.all())
    tipo_facturacion = serializers.PrimaryKeyRelatedField(queryset=TipoFacturacion.objects.all())
    condicion_IVA = serializers.PrimaryKeyRelatedField(queryset=TipoCondicionIva.objects.all())

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
            'estado',
        ]

class ClientQueryParamsSerializer(serializers.Serializer):
    cuit = serializers.CharField(required=False, max_length=11, allow_blank=True, error_messages={
        'max_length': 'El cuit debe tener 11 números, sin caracteres especiales.',
        'invalid': 'El cuit debe tener 11 números, sin caracteres especiales.'
    })
    searchQuery = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

class ClientResponseSerializer(serializers.ModelSerializer):
    '''
    DTO para mostrar la información del cliente
    '''
    localidad = DistrictResponseSerializer()  
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
            'nombre_fantasia',
            'estado',
        ]