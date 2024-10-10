from rest_framework import status
from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from .repositories import ProductRepository
from .serializers import ProductSerializer

class GetAllProducts(APIView):
    '''
    Lista todos los productos
    '''
    def __init__(self, product_repository = None):
        self.product_repository = product_repository or ProductRepository()

    def get(self, request):
        try:
            products = self.product_repository.get_all_products()
            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)