from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import BillRepository
from .serializers import BillSerializer

class GetAllBills(APIView):
    '''
    Lista todas las facturas
    '''
    def __init__(self, bill_repository = None):
        self.bill_repository = bill_repository or BillRepository()

    def get(self, request):
        try:
            bills = self.bill_repository.get_all_bills()
            serializer = BillSerializer(bills, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)