from decimal import Decimal
from rest_framework import serializers
from .models import OwnCheck
from banco.models import Banco
from banco.serializers import BankSerializer


class OwnCheckWriteSerializer(serializers.Serializer):
    '''
    DTO para Create, Update y Partial Update de cheques propios.
    '''
    numero = serializers.IntegerField()
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    fecha_emision = serializers.DateField()
    fecha_vencimiento = serializers.DateField()
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())
    observaciones = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)


class OwnCheckResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: cheque propio con banco expandido y proveedor inferido desde pago_compra.
    '''
    banco = BankSerializer()
    proveedor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = OwnCheck
        fields = [
            'numero',
            'importe',
            'fecha_emision',
            'fecha_vencimiento',
            'banco',
            'pago_compra',
            'proveedor_nombre',
            'estado',
            'observaciones',
        ]

    def get_proveedor_nombre(self, obj):
        try:
            return obj.pago_compra.compra.proveedor.nombre
        except AttributeError:
            return None


class OwnCheckQueryParamsSerializer(serializers.Serializer):
    estado = serializers.CharField(required=False)
    banco = serializers.CharField(required=False)
