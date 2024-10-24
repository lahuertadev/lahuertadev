from rest_framework import serializers
from .models import PagoFactura
from pago.serializers import PaymentSerializer
from factura.serializers import BillSerializer

class BillPaymentSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    pago = PaymentSerializer()
    factura = BillSerializer()

    class Meta:
        model = PagoFactura
        fields = [
            'id', 
            'pago',
            'factura',
            'importe_abonado',
        ]
