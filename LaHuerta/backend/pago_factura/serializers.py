from decimal import Decimal
from rest_framework import serializers
from .models import PagoFactura
from pago_cliente.models import PagoCliente
from factura.models import Factura
from factura.serializers import BillResponseSerializer


class BillPaymentCreateSerializer(serializers.Serializer):
    '''
    DTO para imputar un pago a una factura (POST).
    '''
    pago_cliente = serializers.PrimaryKeyRelatedField(queryset=PagoCliente.objects.all())
    factura = serializers.PrimaryKeyRelatedField(queryset=Factura.objects.all())
    importe_abonado = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )


class BillPaymentUpdateSerializer(serializers.Serializer):
    '''
    DTO para editar una imputación (PUT / PATCH).
    Solo se puede modificar el importe abonado — pago y factura son fijos.
    '''
    importe_abonado = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )


class BillPaymentResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: imputación con factura anidada.
    '''
    factura = BillResponseSerializer()

    class Meta:
        model = PagoFactura
        fields = ['id', 'pago_cliente', 'factura', 'importe_abonado']


class BillPaymentQueryParamsSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField(required=False)
    bill_id = serializers.IntegerField(required=False)
