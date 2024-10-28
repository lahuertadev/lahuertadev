from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import MarketRepository
from .serializers import MarketSerializer

class GetAllMarkets(APIView):
    '''
    Lista todos los mercados
    '''
    def __init__(self, market_repository = None):
        self.market_repository = market_repository or MarketRepository()

    def get(self, request):
        try:
            days = self.market_repository.get_all_markets()
            serializer = MarketSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)