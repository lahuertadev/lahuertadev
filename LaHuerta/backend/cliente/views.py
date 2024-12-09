from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    ClientQueryParamsSerializer, 
    ClientCreateUpdateSerializer,
    ClientResponseSerializer
)
from .repositories import ClientRepository
from localidad.services import DistrictService

class ClientViewSet(viewsets.ModelViewSet):
    '''
    Gestión de clientes
    '''
    client_repository = ClientRepository()
    serializer_class = ClientCreateUpdateSerializer
    district_service = DistrictService()

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.client_repository.get_all_clients()

    def list (self, request):
        '''
        Obtiene todos los clientes y si hay filtros, obtiene con ellos.
        '''
        serializer = ClientQueryParamsSerializer(data=request.query_params)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        cuit = serializer.validated_data.get('cuit', None)
        searchQuery = serializer.validated_data.get('searchQuery', None)
        address = serializer.validated_data.get('address', None)

        clients = self.client_repository.get_all_clients(cuit=cuit, searchQuery=searchQuery, address=address)
        clients_serialized = ClientResponseSerializer(clients, many=True)
        return Response(clients_serialized.data)

    def create (self, request):
        '''
        Crea un nuevo cliente y su respectiva localidad en caso de no existir.
        '''
        try:
            distric_data = request.data.get('localidad')
            if distric_data:
                district = self.district_service.create_or_get_district(distric_data)
                request.data['localidad'] = district.get('district').id

            cuit = request.data.get('cuit')
            if cuit:
                existing_client = self.client_repository.get_client_by_cuit(cuit)
                if existing_client:
                    response_serializer = ClientResponseSerializer(existing_client)
                    return Response(response_serializer.data, status=status.HTTP_200_OK)

            serializer = ClientCreateUpdateSerializer(data=request.data)

            if serializer.is_valid():
                client = self.client_repository.create_client(serializer.validated_data)
                client.localidad = district['district']
                response_serializer = ClientResponseSerializer(client)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except KeyError as e:
            return Response({'error': f'Missing key: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # def update (self, request, pk=None):
    #     '''
    #     Actualiza un gasto
    #     '''
    #     serializer = ExpenseEditSerializer(data=request.data)
    #     if serializer.is_valid():
    #         try:
    #             self.expense_repository.modify_expense(pk, serializer.validated_data)
    #             return Response(status=status.HTTP_200_OK)
    #         except Gasto.DoesNotExist:
    #             return Response({'error': 'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # def destroy(self, request, pk=None):
    #     '''
    #     Elimina un gasto por su ID.
    #     '''
    #     try:
    #         self.expense_repository.delete_expense(pk)

    #         return Response({'message': 'Gasto eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)
    #     except Gasto.DoesNotExist:
    #         return Response({'error': 'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    # @action(detail=False, methods=['delete'], url_path='bulk_delete')
    # def bulk_delete(self, request):