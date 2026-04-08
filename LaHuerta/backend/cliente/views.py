from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    ClientQueryParamsSerializer,
    ClientCreateSerializer,
    ClientResponseSerializer,
    ClientUpdateSerializer,
)
from .repositories import ClientRepository
from .interfaces import IClientRepository
from localidad.services import DistrictService
from .exceptions import (
    ClientNotFoundException,
    CuitAlreadyExistsException,
    BusinessNameAlreadyExistsException,
)
from lista_precios_producto.models import ListaPreciosProducto
from lista_precios_producto.serializers import PriceListProductSerializer
from django.db import IntegrityError


class ClientViewSet(ViewSet):
    '''
    Gestión de clientes.
    '''

    def __init__(self, repository: IClientRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.client_repository = repository or ClientRepository()
        self.district_service = DistrictService()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _resolve_localidad(self, data: dict) -> tuple[dict, object | None]:
        '''
        Si 'localidad' llega como objeto (dict), llama al servicio para
        obtener/crear la instancia y reemplaza el valor por su ID.
        Devuelve (data_modificado, district_instance | None).
        '''
        district = None
        localidad_raw = data.get('localidad')

        if isinstance(localidad_raw, dict):
            result = self.district_service.create_or_get_district(localidad_raw)
            district = result.get('district') if result else None
            if not district:
                return data, None
            data = {**data, 'localidad': district.id}

        return data, district

    # ------------------------------------------------------------------
    # Endpoints
    # ------------------------------------------------------------------

    def list(self, request):
        '''
        Obtiene todos los clientes. Acepta filtros por cuit, searchQuery y address.
        '''
        serializer = ClientQueryParamsSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            clients = self.client_repository.get_all_clients(
                cuit=serializer.validated_data.get('cuit'),
                searchQuery=serializer.validated_data.get('searchQuery'),
                address=serializer.validated_data.get('address'),
            )
            return Response(ClientResponseSerializer(clients, many=True).data, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {'detail': 'Error al obtener los clientes.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un cliente por id.
        '''
        try:
            client = self.client_repository.get_client_by_id(pk)
            if not client:
                raise ClientNotFoundException('Cliente no encontrado.')

            serializer = ClientResponseSerializer(client)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ClientNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener el cliente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Crea un nuevo cliente.
        '''
        try:
            # Resolve localidad
            data, district = self._resolve_localidad(request.data.copy())
            if isinstance(request.data.get('localidad'), dict) and not district:
                return Response(
                    {'detail': 'Error al procesar la localidad.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = ClientCreateSerializer(data=data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            client = self.client_repository.create_client(serializer.validated_data)

            if district:
                client.localidad = district

            return Response(ClientResponseSerializer(client).data, status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response({'detail': 'El cuit o razón social ya se encuentra registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        '''
        Actualiza un cliente. Busca primero; si no existe, 404.
        El objeto encontrado se pasa al repositorio sin segunda búsqueda.
        '''
        client = self.client_repository.get_client_by_id(pk)
        if not client:
            raise ClientNotFoundException('Cliente no encontrado.')
    
        try:
            data, district = self._resolve_localidad(dict(request.data))
            if isinstance(request.data.get('localidad'), dict) and not district:
                return Response(
                    {'detail': 'Error al procesar la localidad.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = ClientUpdateSerializer(client, data=data)

            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_client = self.client_repository.modify_client(client, serializer.validated_data)
            
            if district:
                updated_client.localidad = district

            return Response(ClientResponseSerializer(updated_client).data, status=status.HTTP_200_OK)

        except ClientNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CuitAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except BusinessNameAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError:
            return Response({'detail': 'El cuit o razón social ya se encuentra registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Ocurrió un error al actualizar el cliente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Actualiza parcialmente un cliente.
        '''
        client = self.client_repository.get_client_by_id(pk)
        if not client:
            raise ClientNotFoundException('Cliente no encontrado.')
        
        try:
            data, district = self._resolve_localidad(request.data.copy())

            serializer = ClientUpdateSerializer(client, data=data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_client = self.client_repository.modify_client(client, serializer.validated_data)
            if district:
                updated_client.localidad = district

            return Response(ClientResponseSerializer(updated_client).data, status=status.HTTP_200_OK)
        
        except ClientNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        except CuitAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        except BusinessNameAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        except IntegrityError:
            return Response({'detail': 'El cuit o razón social ya se encuentra registrado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception:
            return Response(
                {'detail': 'Ocurrió un error al actualizar el cliente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un cliente. Busca primero; si no existe, 404.
        El objeto encontrado se pasa directamente al repositorio.
        '''
        client = self.client_repository.get_client_by_id(pk)
        if not client:
            return Response({'detail': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            self.client_repository.delete_client(client)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception:
            return Response(
                {'detail': 'Ocurrió un error al eliminar el cliente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], url_path='products-with-prices')
    def products_with_prices(self, request, pk=None):
        '''
        Devuelve los productos con precios de la lista asignada al cliente.
        Usado para armar el detalle de una factura en el frontend.
        '''
        client = self.client_repository.get_client_by_id(pk)
        if not client:
            return Response({'detail': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if not client.lista_precios_id:
            return Response(
                {'detail': 'El cliente no tiene lista de precios asignada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = ListaPreciosProducto.objects.filter(
            lista_precios_id=client.lista_precios_id
        ).select_related('producto', 'tipo_venta')
        return Response(PriceListProductSerializer(items, many=True).data, status=status.HTTP_200_OK)
