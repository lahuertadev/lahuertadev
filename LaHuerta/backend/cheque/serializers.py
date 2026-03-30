from decimal import Decimal
from rest_framework import serializers
from .models import Cheque
from banco.models import Banco
from banco.serializers import BankSerializer
from estado_cheque.models import EstadoCheque
from estado_cheque.serializers import EstadoChequeSerializer
from pago_cliente.models import PagoCliente
from pago_compra.models import PagoCompra


class CheckWriteSerializer(serializers.Serializer):
    '''
    DTO para Create, Update y Partial Update de cheques.
    '''
    numero = serializers.IntegerField()
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    fecha_emision = serializers.DateField()
    fecha_deposito = serializers.DateField(required=False, allow_null=True)
    fecha_endoso = serializers.DateField(required=False, allow_null=True)
    endosado = serializers.BooleanField(required=False, default=False)
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())
    estado = serializers.PrimaryKeyRelatedField(queryset=EstadoCheque.objects.all())
    pago_cliente = serializers.PrimaryKeyRelatedField(queryset=PagoCliente.objects.all(), required=False, allow_null=True)
    pago_compra = serializers.PrimaryKeyRelatedField(queryset=PagoCompra.objects.all(), required=False, allow_null=True)


class EndorseCheckSerializer(serializers.Serializer):
    '''
    DTO para el endoso de un cheque.
    '''
    pago_compra = serializers.PrimaryKeyRelatedField(queryset=PagoCompra.objects.all())


class CheckResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: cheque con relaciones expandidas.
    '''
    banco = BankSerializer()
    estado = EstadoChequeSerializer()

    class Meta:
        model = Cheque
        fields = [
            'numero',
            'importe',
            'fecha_emision',
            'fecha_deposito',
            'fecha_endoso',
            'endosado',
            'banco',
            'estado',
            'pago_cliente',
            'pago_compra',
        ]
