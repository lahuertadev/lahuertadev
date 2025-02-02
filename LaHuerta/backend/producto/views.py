from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Producto
from .serializers import (
    ProductSerializer, 
    ProductQueryParamsSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer
)
from .repositories import ProductRepository
from .exceptions import ProductNotFoundException
from lista_precios_producto.repositorioes import ProductPriceListRepository
from factura_producto.repositories import BillProductRepository
from compra_producto.repositories import BuyProductRepository 

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
    
    def create(self, request, *args, **kwargs):
        '''
        Crea un nuevo producto
        '''
        # Serialización de los datos enviados
        serializer = ProductCreateSerializer(data=request.data)

        # Verifica si los datos son válidos
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Creación del producto
            product = self.product_repository.create_product(serializer.validated_data)

            # Serializar el producto recién creado
            product_serialized = self.get_serializer(product)
            return Response(product_serialized.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Manejo de errores generales
            return Response(
                {'error': 'Ocurrió un error inesperado en el servidor', 'detalle': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def partial_update(self, request, pk=None):
        '''
        Actualiza parcialmente un producto existente
        '''
        try:
            #* obtener producto por el id
            product = self.product_repository.get_product_by_id(pk)

            #* Serialización con el argumento `partial=True` para permitir actualizaciones parciales
            serializer = ProductUpdateSerializer(product, data=request.data, partial=True)

            if serializer.is_valid():

                #* Modifica el producto usando los datos validados
                updated_product = self.product_repository.update_product(product, serializer.validated_data)

                #* Serializa el producto actualizado para la respuesta
                product_serialized = ProductSerializer(updated_product)
                return Response(product_serialized.data, status=status.HTTP_200_OK)

            #* Si los datos no son válidos
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ProductNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response(
                {"error": "Ocurrió un error inesperado", "detalle": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def destroy(self, request, pk=None):
        '''
        Elimina un producto si el mismo no está en una factura o en una lista de precios
        '''
        try:
            product_list_prices_repository = ProductPriceListRepository()
            bill_product_repository = BillProductRepository()
            buy_product_repository = BuyProductRepository()

            existing_product = self.product_repository.get_product_by_id(pk)
            if existing_product:
                if product_list_prices_repository.verify_product_on_price_list(pk):
                    return Response(
                    {"detail": "El producto está asociado a una lista de precios y no puede ser eliminado."},
                    status=status.HTTP_400_BAD_REQUEST
                )

                if bill_product_repository.verify_product_on_bill(pk):
                    return Response(
                    {"detail": "El producto está asociado a una factura y no puede ser eliminado."},
                    status=status.HTTP_400_BAD_REQUEST
                )

                if buy_product_repository.verify_product_on_buys(pk):
                    return Response(
                    {"detail": "El producto está asociado a una compra y no puede ser eliminado."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
                self.product_repository.delete_product(existing_product)
                return Response({'detail':'Producto eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        
        except ProductNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response(
                {"error": "Ocurrió un error inesperado", "detalle": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        

        
