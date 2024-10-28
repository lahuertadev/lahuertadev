from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import TownRepository
from .serializers import TownSerializer

class GetAllTowns(APIView):
    '''
    Lista todas las localidades
    '''
    def __init__(self, town_repository = None):
        self.town_repository = town_repository or TownRepository()

    def get(self, request):
        try:
            days = self.town_repository.get_all_towns()
            serializer = TownSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)