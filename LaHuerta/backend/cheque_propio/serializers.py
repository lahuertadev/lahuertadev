from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers
from .models import OwnCheck
from banco.models import Banco
from banco.serializers import BankSerializer
from pago_compra.constants import PAYMENT_KIND_PURCHASE, PAYMENT_KIND_ON_ACCOUNT


class OwnCheckCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de cheques propios. Las reglas de negocio (duplicado,
    rango de fechas) se validan en OwnCheckService, no acá.
    '''
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())

    class Meta:
        model = OwnCheck
        fields = ['numero', 'importe', 'fecha_emision', 'fecha_deposito', 'fecha_vencimiento', 'banco', 'observaciones']


class OwnCheckUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de cheques propios. Las reglas de negocio
    (duplicado, uso en pagos, rango de fechas) se validan en OwnCheckService.
    '''
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())

    class Meta:
        model = OwnCheck
        fields = ['numero', 'importe', 'fecha_emision', 'fecha_deposito', 'fecha_vencimiento', 'banco', 'observaciones']


class OwnCheckResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: cheque propio con banco expandido, y el proveedor, las compras y
    los pagos (de compras y a cuenta) inferidos desde los pagos asociados.
    '''
    banco = BankSerializer()
    supplier_name = serializers.SerializerMethodField()
    supplier = serializers.SerializerMethodField()
    purchases = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    used_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()

    class Meta:
        model = OwnCheck
        fields = [
            'id',
            'numero',
            'importe',
            'fecha_emision',
            'fecha_deposito',
            'fecha_vencimiento',
            'banco',
            'supplier_name',
            'supplier',
            'purchases',
            'payments',
            'used_amount',
            'remaining_balance',
            'estado',
            'observaciones',
        ]

    def _first_supplier(self, obj):
        first_payment = obj.pagocompra_set.first()
        return getattr(first_payment, 'proveedor', None) if first_payment else None

    def _used_amount(self, obj):
        return obj.pagocompra_set.aggregate(total=Sum('importe_abonado'))['total'] or Decimal('0')

    def get_supplier_name(self, obj):
        supplier = self._first_supplier(obj)
        return supplier.nombre if supplier else None

    def get_supplier(self, obj):
        supplier = self._first_supplier(obj)
        if not supplier:
            return None
        return {'id': supplier.id, 'nombre': supplier.nombre, 'puesto': supplier.puesto}

    def get_purchases(self, obj):
        return [payment.compra_id for payment in obj.pagocompra_set.all() if payment.compra_id]

    def get_payments(self, obj):
        payments = sorted(obj.pagocompra_set.all(), key=lambda payment: (payment.fecha_pago, payment.id))
        return [
            {
                'id': payment.id,
                'fecha_pago': payment.fecha_pago,
                'tipo': PAYMENT_KIND_PURCHASE if payment.compra_id else PAYMENT_KIND_ON_ACCOUNT,
                'compra': (
                    {'id': payment.compra.id, 'fecha': payment.compra.fecha}
                    if payment.compra_id else None
                ),
                'importe_abonado': payment.importe_abonado,
            }
            for payment in payments
        ]

    def get_used_amount(self, obj):
        return self._used_amount(obj)

    def get_remaining_balance(self, obj):
        return obj.importe - self._used_amount(obj)


class OwnCheckQueryParamsSerializer(serializers.Serializer):
    state = serializers.CharField(required=False)
    bank = serializers.CharField(required=False)
    available = serializers.BooleanField(required=False)
    supplier_id = serializers.IntegerField(required=False)
