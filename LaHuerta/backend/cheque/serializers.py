from rest_framework import serializers
from .models import Cheque
from banco.serializers import BankSerializer
from pago.serializers import PaymentSerializer

class CheckSerializer(serializers.ModelSerializer):
    '''
    DTO
    '''
    banco = BankSerializer()
    pago = PaymentSerializer()

    class Meta:
        model = Cheque
        fields = [
            'numero', 
            'importe',
            'fecha_emision',
            'fecha_deposito',
            'check_deposito',
            'acreditado',
            'fecha_deposito_pago',
            'check_pago_proveedor',
            'banco',
            'pago'
        ]