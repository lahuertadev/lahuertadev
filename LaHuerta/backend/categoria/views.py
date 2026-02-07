from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ViewSet
from .serializers import CategorySerializer
from .interfaces import ICategoryRepository
from .repositories import CategoryRepository
from .exceptions import CategoryHasProductsException, CategoryNotFoundException
from producto.repositories import ProductRepository

class CategoryViewSet(ViewSet):
    '''
    Gestión de Categorías
    '''

    def __init__(self, repository: ICategoryRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or CategoryRepository()

    def list(self, request):
        '''
        Obtiene todas las categorías.
        '''
        categories = self.repository.get_all_categories()
        categories_serialized = CategorySerializer(categories, many=True)
        return Response(categories_serialized.data)

    def retrieve(self, request, pk=None):
        '''
        Obtiene una categoría por ID.
        '''
        try:
            category = self.repository.get_category_by_id(pk)
            if not category:
                raise CategoryNotFoundException('La categoría seleccionada no existe')

            category_serialized = CategorySerializer(category)
            return Response(category_serialized.data, status=status.HTTP_200_OK)
        except CategoryNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        '''
        Crea una nueva categoría.
        '''
        serializer = CategorySerializer(data=request.data)

        if serializer.is_valid():
            try:
                category = self.repository.create_category(serializer.validated_data)
                category_serialized = CategorySerializer(category)
                return Response(category_serialized.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, pk=None):
        '''
        Actualiza una categoría
        '''
        try:
            category = self.repository.get_category_by_id(pk)

            if not category:
                raise CategoryNotFoundException('La categoría seleccionada no existe')
            
            serializer = CategorySerializer(data=request.data)

            if serializer.is_valid():
                category = self.repository.modify_category(pk, serializer.validated_data)
                category_serialized = CategorySerializer(category)
                return Response(category_serialized.data,status=status.HTTP_200_OK)
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
            category = self.repository.get_category_by_id(pk)

            if not category:
                raise CategoryNotFoundException('La categoría seleccionada no existe')
            
            product_repository = ProductRepository()
            related_products = product_repository.verify_products_with_category_id(pk)

            if related_products:
                raise CategoryHasProductsException('La categoría seleccionada tiene productos asociados')
            
            self.repository.destroy_category(pk)
            return Response({'message': 'La categoría fue eliminada exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        
        except CategoryHasProductsException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except CategoryNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)