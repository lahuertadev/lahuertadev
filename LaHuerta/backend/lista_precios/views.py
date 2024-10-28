from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import PricesListRepository
from .serializers import PricesListSerializer

class GetAllPricesList(APIView):
    '''
    Lista todas las listas de precios
    '''
    def __init__(self, prices_list_repository = None):
        self.prices_list_repository = prices_list_repository or PricesListRepository()

    def get(self, request):
        try:
            prices_list = self.prices_list_repository.get_all_prices_list()
            serializer = PricesListSerializer(prices_list, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)