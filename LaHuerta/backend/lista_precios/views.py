import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError
from .repositories import PricesListRepository
from rest_framework.viewsets import ViewSet
from .serializers import (
    AssignClientsSerializer,
    PricesListCreateSerializer,
    PricesListPutSerializer,
    PricesListSerializer,
    PricesListUpdateSerializer,
)
from .interfaces import IPricesListRepository
from .exceptions import PricesListNotFoundException, PricesListInUseException, ClientsNotFoundException

logger = logging.getLogger(__name__)

class PricesListViewSet(ViewSet):
    """
    CRUD de listas de precios
    """

    def __init__(self, repository: IPricesListRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or PricesListRepository()

    def list(self, request):
        '''
        Obtiene todas las listas de precios con filtros opcionales.
        '''
        nombre = request.query_params.get('nombre', None)
        
        prices_list = self.repository.get_all_prices_list(nombre=nombre)
        serializer = PricesListSerializer(prices_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        '''
        Obtiene una lista de precios por ID.
        '''
        try:
            price_list = self.repository.get_prices_list_by_id(pk)

            if not price_list:
                raise PricesListNotFoundException('La lista de precios no existe')

            serializer = PricesListSerializer(price_list)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error al obtener lista de precios pk=%s", pk)
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        serializer = PricesListCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            price_list = self.repository.create_prices_list(serializer.validated_data)
            response_serializer = PricesListSerializer(price_list)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response({"error": "Ya existe una lista de precios con ese nombre"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Error al crear lista de precios")
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Actualiza una lista de precios
        '''
        try:
            price_list = self.repository.get_prices_list_by_id(pk)
            if not price_list:
                raise PricesListNotFoundException("La lista de precios no existe")
            
            serializer = PricesListPutSerializer(data=request.data)
            if serializer.is_valid():
                price_list = self.repository.modify_prices_list(price_list, serializer.validated_data)
                response_serializer = PricesListSerializer(price_list)
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except (IntegrityError, ValueError) as e:
            return Response({"error": str(e) if isinstance(e, ValueError) else "Ya existe una lista de precios con ese nombre"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error al actualizar lista de precios pk=%s", pk)
            return Response({"error": f"Ocurrió un error inesperado: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, pk=None):
        '''
        Actualiza parcialmente una lista de precios
        '''
        try:
            price_list = self.repository.get_prices_list_by_id(pk)
            if not price_list:
                raise PricesListNotFoundException("La lista de precios no existe")
            
            serializer = PricesListUpdateSerializer(data=request.data, partial=True)
            if serializer.is_valid():
                price_list = self.repository.modify_prices_list(price_list, serializer.validated_data)
                response_serializer = PricesListSerializer(price_list)
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except (IntegrityError, ValueError) as e:
            return Response({"error": str(e) if isinstance(e, ValueError) else "Ya existe una lista de precios con ese nombre"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error al actualizar parcialmente lista de precios pk=%s", pk)
            return Response({"error": f"Ocurrió un error inesperado: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        try:
            price_list = self.repository.get_prices_list_by_id(pk)
            if not price_list:
                raise PricesListNotFoundException("La lista de precios no existe")

            assigned_clients = self.repository.count_assigned_clients(price_list)
            if assigned_clients:
                clients_text = "1 cliente" if assigned_clients == 1 else f"{assigned_clients} clientes"
                raise PricesListInUseException(
                    f'No se puede eliminar la lista "{price_list.nombre}": está asignada a {clients_text}. '
                    'Asignales otra lista de precios primero.'
                )

            self.repository.destroy_prices_list(price_list)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except PricesListInUseException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Error al eliminar lista de precios pk=%s", pk)
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def assign_clients(self, request, pk=None):
        '''
        Asigna esta lista de precios a varios clientes de una vez.
        '''
        try:
            price_list = self.repository.get_prices_list_by_id(pk)
            if not price_list:
                raise PricesListNotFoundException("La lista de precios no existe")

            serializer = AssignClientsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            client_ids = serializer.validated_data['client_ids']
            missing_ids = self.repository.get_missing_client_ids(client_ids)
            if missing_ids:
                raise ClientsNotFoundException(
                    f"No existen los clientes con id: {', '.join(str(client_id) for client_id in missing_ids)}"
                )

            assigned = self.repository.assign_to_clients(price_list, client_ids)
            return Response({"assigned": assigned}, status=status.HTTP_200_OK)

        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except ClientsNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Error al asignar lista de precios pk=%s a clientes", pk)
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        '''
        Duplica una lista de precios con todos sus productos.
        '''
        try:
            original_list = self.repository.get_prices_list_by_id(pk)
            if not original_list:
                raise PricesListNotFoundException("La lista de precios no existe")

            new_list = self.repository.duplicate_prices_list(original_list)

            response_serializer = PricesListSerializer(new_list)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except IntegrityError:
            return Response(
                {"error": "Error de integridad al duplicar la lista"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Error al duplicar lista de precios pk=%s", pk)
            return Response(
                {"error": f"Ocurrió un error inesperado: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )