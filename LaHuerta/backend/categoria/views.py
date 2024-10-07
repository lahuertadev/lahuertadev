from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import CategoryRepository
from .serializers import CategorySerializer

class GetAllCategories(APIView):
    '''
    Lista todos las categorías
    '''
    def __init__(self, category_repository = None):
        self.category_repository = category_repository or CategoryRepository()

    def get(self, request):
        try:
            days = self.category_repository.get_all_categories()
            serializer = CategorySerializer(days, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)