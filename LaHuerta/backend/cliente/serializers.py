from rest_framework import serializers
from core.mixins import CapitalizedFieldsMixin
from .models import Cliente
from tipo_condicion_iva.models import TipoCondicionIva
from localidad.models import Localidad
from lista_precios.models import ListaPrecios
from localidad.serializers import DistrictResponseSerializer
from tipo_condicion_iva.serializers import ConditionIvaTypeSerializer
from lista_precios.serializers import PricesListSerializer


class DeliveryAddressValidationMixin:
    '''
    Para serializers de alta/edición: la dirección de entrega es opcional, pero si
    llega la localidad o el domicilio de entrega, se exigen los dos. En una edición
    parcial, el campo que no llega se toma del cliente.
    '''

    def validate(self, attrs):
        attrs = super().validate(attrs)

        def current_value(field):
            if field in attrs:
                return attrs[field]
            return getattr(self.instance, field, None) if self.partial else None

        delivery_district = current_value('localidad_entrega')
        delivery_address = (current_value('domicilio_entrega') or '').strip()

        if delivery_district and not delivery_address:
            raise serializers.ValidationError({'domicilio_entrega': 'La dirección de entrega es obligatoria.'})
        if delivery_address and not delivery_district:
            raise serializers.ValidationError({'localidad_entrega': 'La localidad de entrega es obligatoria.'})

        if 'domicilio_entrega' in attrs and not delivery_address:
            attrs['domicilio_entrega'] = None
        return attrs


class ClientCreateSerializer(DeliveryAddressValidationMixin, CapitalizedFieldsMixin, serializers.ModelSerializer):
    '''
    DTO para la creación o modificación de clientes.
    '''
    capitalized_fields = ('razon_social', 'nombre_fantasia', 'domicilio', 'domicilio_entrega')

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
    condicion_IVA = serializers.PrimaryKeyRelatedField(queryset=TipoCondicionIva.objects.all())
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all(), required=False, allow_null=True)
    localidad_entrega = serializers.PrimaryKeyRelatedField(queryset=Localidad.objects.all(), required=False, allow_null=True)
    domicilio_entrega = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Cliente
        fields = [
            'id',
            'cuit',
            'razon_social',
            'cuenta_corriente',
            'domicilio',
            'localidad',
            'condicion_IVA',
            'telefono',
            'fecha_inicio_ventas',
            'nombre_fantasia',
            'estado',
            'lista_precios',
            'domicilio_entrega',
            'localidad_entrega',
        ]

    def validate_cuit(self, value):
        if Cliente.objects.filter(cuit=value).exists():
            raise serializers.ValidationError('El CUIT ya se encuentra registrado.')
        return value

    def validate_razon_social(self, value):
        if Cliente.objects.filter(razon_social__iexact=value).exists():
            raise serializers.ValidationError('La razón social ya se encuentra registrada.')
        return value

class ClientUpdateSerializer(DeliveryAddressValidationMixin, CapitalizedFieldsMixin, serializers.ModelSerializer):
    '''
    DTO para la creación o modificación de clientes.
    '''
    capitalized_fields = ('razon_social', 'nombre_fantasia', 'domicilio', 'domicilio_entrega')

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
    condicion_IVA = serializers.PrimaryKeyRelatedField(queryset=TipoCondicionIva.objects.all())
    lista_precios = serializers.PrimaryKeyRelatedField(queryset=ListaPrecios.objects.all(), required=False, allow_null=True)
    localidad_entrega = serializers.PrimaryKeyRelatedField(queryset=Localidad.objects.all(), required=False, allow_null=True)
    domicilio_entrega = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    class Meta:
        model = Cliente
        fields = [
            'id',
            'cuit',
            'razon_social',
            'cuenta_corriente',
            'domicilio',
            'localidad',
            'condicion_IVA',
            'telefono',
            'fecha_inicio_ventas',
            'nombre_fantasia',
            'estado',
            'lista_precios',
            'domicilio_entrega',
            'localidad_entrega',
        ]

    def validate_cuit(self, cuit):
        if Cliente.objects.filter(cuit=cuit).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('El CUIT ya se encuentra registrado.')
        return cuit

    def validate_razon_social(self, razon_social):
        if Cliente.objects.filter(razon_social__iexact=razon_social).exclude(id=self.instance.id).exists():
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
    condicion_IVA = ConditionIvaTypeSerializer()
    lista_precios = PricesListSerializer(read_only=True)
    localidad_entrega = DistrictResponseSerializer(allow_null=True)

    class Meta:
        model = Cliente
        fields = [
            'id',
            'cuit',
            'razon_social',
            'cuenta_corriente',
            'domicilio',
            'localidad',
            'condicion_IVA',
            'telefono',
            'fecha_inicio_ventas',
            'nombre_fantasia',
            'estado',
            'lista_precios',
            'domicilio_entrega',
            'localidad_entrega',
        ]