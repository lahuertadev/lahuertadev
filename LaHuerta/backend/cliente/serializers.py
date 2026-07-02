from rest_framework import serializers
from .models import Cliente
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
from localidad.models import Localidad
from lista_precios.models import ListaPrecios
from localidad.serializers import DistrictResponseSerializer
from tipo_facturacion.serializers import FacturationTypeSerializer
from tipo_condicion_iva.serializers import ConditionIvaTypeSerializer
from lista_precios.serializers import PricesListSerializer

class ClientCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación o modificación de clientes.
    '''

    cuit = serializers.RegexField(
        regex=r'^\d{11}$',
        error_messages={
            'invalid': 'El CUIT debe contener exactamente 11 números.'
        }
    )

    cuenta_corriente = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        error_messages={
            'invalid': 'Ingresá un número válido.',
            'max_digits': 'El número es demasiado grande.',
            'max_decimal_places': 'Máximo 2 decimales permitidos.',
        }
    )


    localidad = serializers.PrimaryKeyRelatedField(queryset=Localidad.objects.all())
    tipo_facturacion = serializers.PrimaryKeyRelatedField(queryset=TipoFacturacion.objects.all())
    condicion_IVA = serializers.PrimaryKeyRelatedField(queryset=TipoCondicionIva.objects.all())
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all(), required=False, allow_null=True)

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
            'lista_precios',
        ]

    def validate_cuit(self, value):
        if Cliente.objects.filter(cuit=value).exists():
            raise serializers.ValidationError('El CUIT ya se encuentra registrado.')
        return value

    def validate_razon_social(self, value):
        if Cliente.objects.filter(razon_social=value).exists():
            raise serializers.ValidationError('La razón social ya se encuentra registrada.')
        return value
  
class ClientUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación o modificación de clientes.
    '''

    cuit = serializers.RegexField(
        regex=r'^\d{11}$',
        error_messages={
            'invalid': 'El CUIT debe contener exactamente 11 números.'
        }
    )

    cuenta_corriente = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        error_messages={
            'invalid': 'Ingresá un número válido.',
            'max_digits': 'El número es demasiado grande.',
            'max_decimal_places': 'Máximo 2 decimales permitidos.',
        }
    )

    localidad = serializers.PrimaryKeyRelatedField(queryset=Localidad.objects.all())
    tipo_facturacion = serializers.PrimaryKeyRelatedField(queryset=TipoFacturacion.objects.all())
    condicion_IVA = serializers.PrimaryKeyRelatedField(queryset=TipoCondicionIva.objects.all())
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all(), required=False, allow_null=True)
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
            'lista_precios',
        ]

    def validate_cuit(self, cuit):
        if Cliente.objects.filter(cuit=cuit).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('El CUIT ya se encuentra registrado.')
        return cuit

    def validate_razon_social(self, razon_social):
        if Cliente.objects.filter(razon_social=razon_social).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('La razón social ya se encuentra registrada.')
        return razon_social

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
    lista_precios = PricesListSerializer(read_only=True)

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
            'lista_precios',
        ]