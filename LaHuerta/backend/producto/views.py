from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Producto
from .serializers import ProductSerializer, ProductQueryParamsSerializer
from .repositories import ProductRepository

class ProductViewSet(viewsets.ModelViewSet):
    '''
    Gestión de productos
    '''

    product_repository = ProductRepository()
    serializer_class = ProductSerializer

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.product_repository.get_all_products()
    
    def list (self, request):
        '''
        Obtiene todos los productos y si hay filtros, obtiene con ellos.
        '''
        serializer = ProductQueryParamsSerializer(data=request.query_params)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        description = serializer.validated_data.get('description', None)
        category = serializer.validated_data.get('category', None)
        container_type = serializer.validated_data.get('container_type', None)

        products = self.product_repository.get_all_products(description=description, category=category, container_type=container_type)

        product_serializer = self.get_serializer(products, many=True)
        return Response(product_serializer.data)