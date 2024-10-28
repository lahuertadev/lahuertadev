from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import BillPaymentRepository
from .serializers import BillPaymentSerializer

class GetAllBillPayments(APIView):
    '''
    Muestra todos los pagos referenciados a sus facturas
    '''
    def __init__(self, bill_payment_repository = None):
        self.bill_payment_repository = bill_payment_repository or BillPaymentRepository()

    def get(self, request):
        try:
            bill_payments = self.bill_payment_repository.get_all_bill_payments()
            serializer = BillPaymentSerializer(bill_payments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        