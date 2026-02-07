from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ViewSet
from .serializers import ContainerTypeSerializer
from .interfaces import IContainerTypeRepository
from .repositories import ContainerTypeRepository
from .exceptions import ContainerHasProductsException, ContainerNotFoundException
from producto.repositories import ProductRepository


class ContainerTypeViewSet(ViewSet):
    '''
    Gestión de Tipos de Contenedores
    '''

    def __init__(self, repository: IContainerTypeRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or ContainerTypeRepository()

    def list(self, request):
        '''
        Obtiene todos los tipos de contenedores.
        '''
        containers = self.repository.get_all_container_types()
        containers_serialized = ContainerTypeSerializer(containers, many=True)
        return Response(containers_serialized.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        '''
        Obtiene un tipo de contenedor por ID.
        '''
        try:
            container_type = self.repository.get_container_by_id(pk)
            if not container_type:
                raise ContainerNotFoundException('El tipo de contenedor seleccionado no existe')

            container_serialized = ContainerTypeSerializer(container_type)
            return Response(container_serialized.data, status=status.HTTP_200_OK)
        except ContainerNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request):
        '''
        Crea un nuevo tipo de contenedor
        '''
        serializer = ContainerTypeSerializer(data=request.data)

        if serializer.is_valid():
            try:
                container = self.repository.create_container_type(serializer.validated_data)
                container_serialized = ContainerTypeSerializer(container)
                return Response(container_serialized.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, pk=None):
        '''
        Actualiza un tipo de contenedor
        '''
        try:
            container_type = self.repository.get_container_by_id(pk)
            if not container_type:
                raise ContainerNotFoundException('Tipo de contenedor no encontrado.')

            serializer = ContainerTypeSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            container_type = self.repository.modify_container_type(container_type, serializer.validated_data)
            container_type_serialized = ContainerTypeSerializer(container_type)
            return Response(container_type_serialized.data, status=status.HTTP_200_OK)

        except ContainerNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, pk=None):
        '''
        Elimina un tipo de contenedor.
        '''
        try:
            container_type = self.repository.get_container_by_id(pk)

            if not container_type:
                raise ContainerNotFoundException('El tipo de contenedor seleccionado no existe')

            product_repository = ProductRepository()
            related_products = product_repository.verify_products_with_container_type_id(pk)

            if related_products:
                raise ContainerHasProductsException('El tipo de contenedor seleccionado tiene productos asociados')
            
            self.repository.destroy_container_type(container_type)
            return Response({'message': 'Tipo de contenedor eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        
        except ContainerHasProductsException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ContainerNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': 'Ocurrió un error inesperado'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)