from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import BuyRepository
from .serializers import BuySerializer

class GetAllBuys(APIView):
    '''
    Lista todas las compras
    '''
    def __init__(self, buy_repositories = None):
        self.buy_repositories = buy_repositories or BuyRepository()

    def get(self, request):
        try:
            buys = self.buy_repositories.get_all_buys()
            serializer = BuySerializer(buys, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        