from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import ClientRepository
from .serializers import ClientSerializer

class GetAllClients(APIView):
    '''
    Lista todos los clientes
    '''
    def __init__(self, client_repository = None):
        self.client_repository = client_repository or ClientRepository()

    def get(self, request):
        try:
            days = self.client_repository.get_all_clients()
            serializer = ClientSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)