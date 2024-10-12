from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import PaymentRepository
from .serializers import PaymentSerializer

class GetAllPayments(APIView):
    '''
    Muestra todos los pagos
    '''
    def __init__(self, payment_repository = None):
        self.payment_repository = payment_repository or PaymentRepository()

    def get(self, request):
        try:
            payments = self.payment_repository.get_all_payments()
            serializer = PaymentSerializer(payments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        