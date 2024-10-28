from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import BillTypeRepository
from .serializers import BillTypeSerializer

class GetAllBillTypes(APIView):
    '''
    Lista todos los tipos de facturación
    '''
    def __init__(self, bill_type_repository = None):
        self.bill_type_repository = bill_type_repository or BillTypeRepository()

    def get(self, request):
        try:
            days = self.bill_type_repository.get_all_bill_types()
            serializer = BillTypeSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)