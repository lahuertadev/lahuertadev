from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import ClientRepository
from .serializers import (
    ClientSerializer,
    ClientQueryParamsSerializer
)

class GetAllClients(APIView):
    '''
    Lista todos los clientes con o sin filtro.
    '''
    def __init__(self, client_repository = None):
        self.client_repository = client_repository or ClientRepository()

    def get(self, request, *args, **kwargs):

        filters = {
            'cuit': request.GET.get('cuit', ''),
            'searchQuery': request.GET.get('searchQuery', ''),
            'address': request.GET.get('address', '')
        }

        serializer = ClientQueryParamsSerializer(data=filters)

        if not serializer.is_valid():
            return Response({'error': 'Filtros inválidos', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            clients = self.client_repository.get_all_clients(filters)
            client_serializer = ClientSerializer(clients, many=True)
            return Response(client_serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)