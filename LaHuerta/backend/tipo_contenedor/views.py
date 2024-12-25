from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .serializers import ContainerTypeSerializer
from .repositories import ContainerTypeRepository
from .exceptions import ContainerHasProductsException, ContainerNotFoundException
class ContainerTypeViewSet(viewsets.ModelViewSet):
    '''
    Gestión de Tipos de Contenedores
    '''

    container_type_repository = ContainerTypeRepository()
    serializer_class = ContainerTypeSerializer

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.container_type_repository.get_all_container_types()

    def list (self, request):
        '''
        Obtiene todos los tipos de contenedores.
        '''
        containers = self.container_type_repository.get_all_container_types()

        containers_serialized = self.get_serializer(containers, many=True)
        return Response(containers_serialized.data)
    
    def create (self, request):
        '''
        Crea un nuevo tipo de contenedor
        '''
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                container = self.container_type_repository.create_container_type(serializer.validated_data)
                container_serialized = self.get_serializer(container)
                return Response(container_serialized.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update (self, request, pk=None):
        '''
        Actualiza un tipo de contenedor
        '''
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                self.container_type_repository.modify_container_type(pk, serializer.validated_data)
                return Response({'message': 'Tipo de contenedor modificado exitosamente'},status=status.HTTP_200_OK)
            except ContainerNotFoundException as e:
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, pk=None):
        '''
        Elimina un tipo de contenedor.
        '''
        try:
            self.container_type_repository.destroy_container_type(pk)
            return Response({'message': 'Tipo de contenedor eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        except ContainerHasProductsException as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ContainerNotFoundException as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)