from decimal import Decimal
from django.db.models import Sum
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
    DTO de lectura: cheque propio con banco expandido, proveedor y compras inferidos desde los pagos asociados.
    '''
    banco = BankSerializer()
    supplier_name = serializers.SerializerMethodField()
    purchases = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()

    class Meta:
        model = OwnCheck
        fields = [
            'numero',
            'importe',
            'fecha_emision',
            'fecha_vencimiento',
            'banco',
            'supplier_name',
            'purchases',
            'remaining_balance',
            'estado',
            'observaciones',
        ]

    def get_supplier_name(self, obj):
        first_payment = obj.pagocompra_set.first()
        if not first_payment:
            return None
        try:
            return first_payment.compra.proveedor.nombre
        except AttributeError:
            return None

    def get_purchases(self, obj):
        return [payment.compra_id for payment in obj.pagocompra_set.all()]

    def get_remaining_balance(self, obj):
        used = obj.pagocompra_set.aggregate(total=Sum('importe_abonado'))['total'] or Decimal('0')
        return obj.importe - used


class OwnCheckQueryParamsSerializer(serializers.Serializer):
    state = serializers.CharField(required=False)
    bank = serializers.CharField(required=False)
    available = serializers.BooleanField(required=False)
    supplier_id = serializers.IntegerField(required=False)
