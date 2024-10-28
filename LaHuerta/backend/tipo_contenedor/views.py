from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import ContainerTypeRepository
from .serializers import ContainerTypeSerializer

class GetAllContainerTypes(APIView):
    '''
    Lista todos las categorías
    '''
    def __init__(self, type_container_repository = None):
        self.type_container_repository = type_container_repository or ContainerTypeRepository()

    def get(self, request):
        try:
            days = self.type_container_repository.get_all_container_types()
            serializer = ContainerTypeSerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)