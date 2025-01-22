from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .serializers import UnitTypeSerializerResponse
from .repositories import UnitTypeRepository
from .exceptions import (
    UnitTypeAlreadyExistsException, 
    UnitTypeHasProductsException, 
    UnitTypeNotFoundException
)
from producto.repositories import ProductRepository

class UnitTypeViewSet(viewsets.ModelViewSet):
    '''
    Gestión de Categorías
    '''

    unit_type_repository = UnitTypeRepository()
    serializer_class = UnitTypeSerializerResponse

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.unit_type_repository.get_all_unit_types()

    def list (self, request):
        '''
        Obtiene todos los tipos de unidad.
        '''
        unit_types = self.unit_type_repository.get_all_unit_types()

        unit_types_serialized = self.get_serializer(unit_types, many=True)
        return Response(unit_types_serialized.data)
    
    def create (self, request):
        '''
        Crea un nuevo tipo de unidad.
        '''

        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                unit_type = self.unit_type_repository.create_unit_type(serializer.validated_data)
                unit_type_serialized = self.get_serializer(unit_type)
                return Response(unit_type_serialized.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update (self, request, pk=None):
        '''
        Actualiza un tipo de unidad
        '''
        try:
            unit_type = self.unit_type_repository.get_unit_type_by_id(pk)
            
            if not unit_type:
                raise UnitTypeNotFoundException('El tipo de unidad seleccionado no existe')
            
            serializer = self.get_serializer(data=request.data)

            if serializer.is_valid():
                unit_type = self.unit_type_repository.modify_unit_type(pk, serializer.validated_data)
                unit_type_serialized = self.get_serializer(unit_type)
                return Response(unit_type_serialized.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except UnitTypeNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, pk=None):
        '''
        Elimina un tipo de unidad comprobando si existe un producto asociado previamente.
        '''
        try:
            unit_type = self.unit_type_repository.get_unit_type_by_id(pk)

            if not unit_type:
                raise UnitTypeNotFoundException('El tipo de unidad seleccionado no existe')
            
            product_repository = ProductRepository()
            products_related = product_repository.verify_products_with_unit_type_id(pk)

            if products_related:
                raise UnitTypeHasProductsException('El tipo de unidad seleccionado tiene productos asociados')
            
            self.unit_type_repository.destroy_unit_type(pk)
            return Response({'message': 'El tipo de unidad fue eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        
        except UnitTypeHasProductsException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except UnitTypeNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)