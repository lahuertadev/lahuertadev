from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import PaymentTypeRepository
from .serializers import PaymentTypeSerializer

class GetAllUnitTypes(APIView):
    '''
    Lista todos los tipos de pagos
    '''
    def __init__(self, payment_type_repository = None):
        self.payment_type_repository = payment_type_repository or PaymentTypeRepository()

    def get(self, request):
        try:
            days = self.payment_type_repository.get_all_payment_types()
            serializer = PaymentTypeSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)