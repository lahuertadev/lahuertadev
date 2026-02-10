from rest_framework import status
from rest_framework.response import Response
from django.db import IntegrityError
from .repositories import PricesListRepository
from rest_framework.viewsets import ViewSet
from .serializers import (
    PricesListCreateSerializer,
    PricesListPutSerializer,
    PricesListSerializer,
    PricesListUpdateSerializer,
)
from .interfaces import IPricesListRepository
from .exceptions import PricesListNotFoundException

class PricesListViewSet(ViewSet):
    """
    CRUD de listas de precios
    """

    def __init__(self, repository: IPricesListRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or PricesListRepository()

    def list(self, request):
        prices_list = self.repository.get_all_prices_list()
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
        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        try:
            price_list = self.repository.get_prices_list_by_id(pk)
            if not price_list:
                raise PricesListNotFoundException("La lista de precios no existe")

            self.repository.destroy_prices_list(price_list)
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except PricesListNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)