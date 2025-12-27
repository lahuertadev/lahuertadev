from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    ClientQueryParamsSerializer, 
    ClientCreateUpdateSerializer,
    ClientResponseSerializer,
    ClientUpdateSerializer
)
from .repositories import ClientRepository
from localidad.services import DistrictService
from .exceptions import (
    ClientNotFoundException,
    CuitAlreadyExistsException,
    BusinessNameAlreadyExistsException
)

class ClientViewSet(viewsets.ModelViewSet):
    '''
    Gestión de clientes
    '''
    client_repository = ClientRepository()
    serializer_class = ClientResponseSerializer
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
            district_data = request.data.get('localidad')
            if district_data:
                district = self.district_service.create_or_get_district(district_data)
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
    
    def update (self, request, pk=None):
        '''
        Actualiza un cliente
        '''
        try:
            district_data = request.data.get('localidad')
            if district_data:
                district = self.district_service.create_or_get_district(district_data)
                request.data['localidad'] = district.get('district').id

            client = self.client_repository.get_client_by_id(pk)
            if not client:
                raise ClientNotFoundException('Cliente no encontrado')
            serializer = ClientUpdateSerializer(client, data=request.data)
            
            if serializer.is_valid():
                client = self.client_repository.modify_client(pk, serializer.validated_data)
                client.localidad = district['district']
                response_serializer = ClientResponseSerializer(client)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except CuitAlreadyExistsException as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except BusinessNameAlreadyExistsException as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except ClientNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response(
                {"detail": "Ocurrió un error al actualizar el cliente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    