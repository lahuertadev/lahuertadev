from decimal import Decimal
from rest_framework import serializers
from .models import OwnCheck
from banco.models import Banco
from banco.serializers import BankSerializer
from proveedor.models import Proveedor
from proveedor.serializers import SupplierSerializer


class OwnCheckWriteSerializer(serializers.Serializer):
    '''
    DTO para Create, Update y Partial Update de cheques propios.
    '''
    numero = serializers.IntegerField()
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    fecha_emision = serializers.DateField()
    fecha_vencimiento = serializers.DateField()
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    observaciones = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)


class OwnCheckResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: cheque propio con relaciones expandidas.
    '''
    banco = BankSerializer()
    proveedor = SupplierSerializer()

    class Meta:
        model = OwnCheck
        fields = [
            'numero',
            'importe',
            'fecha_emision',
            'fecha_vencimiento',
            'banco',
            'proveedor',
            'estado',
            'observaciones',
        ]


class OwnCheckQueryParamsSerializer(serializers.Serializer):
    proveedor = serializers.CharField(required=False)
    estado = serializers.CharField(required=False)
    banco = serializers.CharField(required=False)
