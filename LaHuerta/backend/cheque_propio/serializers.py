from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers
from .models import OwnCheck
from banco.models import Banco
from banco.serializers import BankSerializer


class OwnCheckCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de cheques propios.
    '''
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())

    class Meta:
        model = OwnCheck
        fields = ['numero', 'importe', 'fecha_emision', 'fecha_deposito', 'fecha_vencimiento', 'banco', 'observaciones']
        extra_kwargs = {
            'numero': {'validators': []}
        }

    def validate(self, data):
        if OwnCheck.objects.filter(numero=data['numero'], banco=data['banco']).exists():
            raise serializers.ValidationError({'numero': 'Ya existe un cheque con ese número para ese banco.'})

        deposit_date = data.get('fecha_deposito')
        due_date = data.get('fecha_vencimiento')
        if deposit_date and due_date and deposit_date > due_date:
            raise serializers.ValidationError({
                'fecha_deposito': 'La fecha de depósito no puede ser posterior a la fecha de vencimiento.'
            })
        return data


class OwnCheckUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de cheques propios.
    '''
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())

    class Meta:
        model = OwnCheck
        fields = ['numero', 'importe', 'fecha_emision', 'fecha_deposito', 'fecha_vencimiento', 'banco', 'observaciones']

    def validate(self, data):
        number = data.get('numero', getattr(self.instance, 'numero', None))
        bank = data.get('banco', getattr(self.instance, 'banco', None))
        if OwnCheck.objects.filter(numero=number, banco=bank).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError({'numero': 'Ya existe un cheque con ese número para ese banco.'})

        deposit_date = data.get('fecha_deposito', getattr(self.instance, 'fecha_deposito', None))
        due_date = data.get('fecha_vencimiento', getattr(self.instance, 'fecha_vencimiento', None))
        if deposit_date and due_date and deposit_date > due_date:
            raise serializers.ValidationError({
                'fecha_deposito': 'La fecha de depósito no puede ser posterior a la fecha de vencimiento.'
            })
        return data


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
            'id',
            'numero',
            'importe',
            'fecha_emision',
            'fecha_deposito',
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
