from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from django.db import IntegrityError

from .interfaces import IProductPriceListRepository
from .repositories import ProductPriceListRepository
from .exceptions import PriceListProductNotFoundException
from .serializers import (
    PriceListProductCreateSerializer,
    PriceListProductPutSerializer,
    PriceListProductSerializer,
    PriceListProductUpdateSerializer,
)


class PriceListProductViewSet(ViewSet):
    """
    CRUD de productos asociados a una lista de precios.

    Filtros soportados (query params):
    - price_list / lista_precios: id de ListaPrecios
    - producto: id de Producto
    - categoria: id de Categoria (del producto)
    - tipo_contenedor: id de TipoContenedor (del producto)
    - descripcion: búsqueda parcial en descripción del producto
    """

    def __init__(self, repository: IProductPriceListRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or ProductPriceListRepository()

    def list(self, request):
        """
        Obtiene todos los productos asociados a una lista de precios con filtros opcionales.
        """
        price_list_id = request.query_params.get("price_list") or request.query_params.get("lista_precios")
        product_id = request.query_params.get("producto")
        category_id = request.query_params.get("categoria")
        container_type_id = request.query_params.get("tipo_contenedor")
        description = request.query_params.get("descripcion")

        qs = self.repository.get_all(
            price_list_id=price_list_id,
            product_id=product_id,
            category_id=category_id,
            container_type_id=container_type_id,
            description=description
        )

        serializer = PriceListProductSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """
        Obtiene un producto asociado a una lista de precios por ID.
        """
        try:
            item = self.repository.get_by_id(pk)
            if not item:
                raise PriceListProductNotFoundException("El item de lista de precios no existe")
            serializer = PriceListProductSerializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PriceListProductNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        serializer = PriceListProductCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            created = self.repository.create(serializer.validated_data)
            response_serializer = PriceListProductSerializer(created)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response({"error": "Ya existe un item con esa combinación de lista y producto"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        """
        PUT: actualización completa (requiere todos los campos).
        """
        try:
            item = self.repository.get_by_id(pk)
            if not item:
                raise PriceListProductNotFoundException("El item de lista de precios no existe")
            
            serializer = PriceListProductPutSerializer(data=request.data)
            if serializer.is_valid():
                updated = self.repository.update(item, serializer.validated_data)
                response_serializer = PriceListProductSerializer(updated)
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except PriceListProductNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, pk=None):
        """
        PATCH: actualización parcial (campos opcionales).
        """
        try:
            item = self.repository.get_by_id(pk)
            if not item:
                raise PriceListProductNotFoundException("El item de lista de precios no existe")

            serializer = PriceListProductUpdateSerializer(data=request.data, partial=True)
            if serializer.is_valid():
                updated = self.repository.update(item, serializer.validated_data)
                response_serializer = PriceListProductSerializer(updated)
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except PriceListProductNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        try:
            item = self.repository.get_by_id(pk)
            if not item:
                raise PriceListProductNotFoundException("El item de lista de precios no existe")

            self.repository.destroy(item)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except PriceListProductNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "Ocurrió un error inesperado"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
