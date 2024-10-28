from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import BankRepository
from .serializers import BankSerializer

class GetAllBanks(APIView):
    '''
    Lista todos los bancos
    '''
    def __init__(self, bank_repository = None):
        self.bank_repository = bank_repository or BankRepository()

    def get(self, request):
        try:
            days = self.bank_repository.get_all_banks()
            serializer = BankSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)