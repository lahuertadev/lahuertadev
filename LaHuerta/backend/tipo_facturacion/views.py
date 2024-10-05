from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import TipoFacturacionRepository
from .serializers import TipoFacturacionSerializer

class GetTypeFacturationAPIView(APIView):
    '''
    Lista todos los tipos de facturación
    '''
    def __init__(self, type_facturation_repository = None):
        self.type_facturation_repository = type_facturation_repository or TipoFacturacionRepository()

    def get(self, request):
        try:
            types_facturation = self.type_facturation_repository.get_all_facturation_types()
            serializer = TipoFacturacionSerializer(types_facturation, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
