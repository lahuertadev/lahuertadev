from rest_framework import serializers
from .models import Proveedor
from mercado.models import Mercado
from mercado.serializers import MarketSerializer
from .exceptions import SupplierNameAlreadyExistsException


class SupplierCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de proveedores.
    '''
    mercado = serializers.PrimaryKeyRelatedField(queryset=Mercado.objects.all())
    nave = serializers.IntegerField(required=False, allow_null=True)
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

    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'puesto', 'nave', 'telefono', 'cuenta_corriente', 'nombre_fantasia', 'mercado']

    def validate_nombre(self, value):
        if Proveedor.objects.filter(nombre=value).exists():
            raise SupplierNameAlreadyExistsException('El nombre ya se encuentra registrado.')
        return value


class SupplierUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de proveedores.
    '''
    mercado = serializers.PrimaryKeyRelatedField(queryset=Mercado.objects.all())
    nave = serializers.IntegerField(required=False, allow_null=True)
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

    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'puesto', 'nave', 'telefono', 'cuenta_corriente', 'nombre_fantasia', 'mercado']

    def validate_nombre(self, value):
        instance = self.instance
        if Proveedor.objects.filter(nombre=value).exclude(id=instance.id).exists():
            raise SupplierNameAlreadyExistsException('El nombre ya se encuentra registrado.')
        return value


class SupplierQueryParamsSerializer(serializers.Serializer):
    searchQuery = serializers.CharField(required=False, allow_blank=True)
    mercado = serializers.CharField(required=False, allow_blank=True)


class SupplierSerializer(serializers.ModelSerializer):
    '''
    DTO de respuesta del proveedor.
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
            'mercado',
        ]
