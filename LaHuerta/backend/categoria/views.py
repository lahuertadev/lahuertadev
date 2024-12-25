from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .serializers import CategorySerializer
from .repositories import CategoryRepository
from .exceptions import CategoryHasProductsException, CategoryNotFoundException

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
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                self.category_repository.modify_category(pk, serializer.validated_data)
                return Response({'message': 'Categoría modificada exitosamente'},status=status.HTTP_200_OK)
            except CategoryNotFoundException as e:
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, pk=None):
            '''
            Elimina una categoría.
            '''
            try:
                self.category_repository.destroy_category(pk)
                return Response({'message': 'Categoría eliminada exitosamente'}, status=status.HTTP_204_NO_CONTENT)
            except CategoryHasProductsException as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except CategoryNotFoundException as e:
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)