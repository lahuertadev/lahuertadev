from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .serializers import CategorySerializer
from .repositories import CategoryRepository
from .exceptions import CategoryHasProductsException, CategoryNotFoundException
from producto.repositories import ProductRepository

class CategoryViewSet(viewsets.ModelViewSet):
    '''
    Gestión de Categorías
    '''

    category_repository = CategoryRepository()
    serializer_class = CategorySerializer

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.category_repository.get_all_categories()

    def list (self, request):
        '''
        Obtiene todas las categorías.
        '''
        categories = self.category_repository.get_all_categories()

        categories_serialized = self.get_serializer(categories, many=True)
        return Response(categories_serialized.data)
    
    def create (self, request):
        '''
        Crea una nueva categoría.
        '''
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                category = self.category_repository.create_category(serializer.validated_data)
                category_serialized = self.get_serializer(category)
                return Response(category_serialized.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update (self, request, pk=None):
        '''
        Actualiza una categoría
        '''
        try:
            category = self.category_repository.get_category_by_id(pk)

            if not category:
                raise CategoryNotFoundException('La categoría seleccionada no existe')
            
            serializer = self.get_serializer(data=request.data)

            if serializer.is_valid():
                self.category_repository.modify_category(pk, serializer.validated_data)
                return Response({'message': 'Categoría modificada exitosamente'},status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except CategoryNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, pk=None):
        '''
        Elimina una categoría.
        '''
        try:
            category = self.category_repository.get_category_by_id(pk)

            if not category:
                raise CategoryNotFoundException('La categoría seleccionada no existe')
            
            product_repository = ProductRepository()
            related_products = product_repository.verify_products_with_category_id(pk)

            if related_products:
                raise CategoryHasProductsException('La categoría seleccionada tiene productos asociados')
            
            self.category_repository.destroy_category(pk)
            return Response({'message': 'La categoría fue eliminada exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        
        except CategoryHasProductsException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except CategoryNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)