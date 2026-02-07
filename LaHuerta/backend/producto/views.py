from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from compra_producto.repositories import BuyProductRepository
from factura_producto.repositories import BillProductRepository
from lista_precios_producto.repositorioes import ProductPriceListRepository

from .exceptions import ProductDeletionNotAllowedException, ProductNotFoundException
from .interfaces import IProductRepository
from .repositories import ProductRepository
from .serializers import (
    ProductCreateSerializer,
    ProductQueryParamsSerializer,
    ProductSerializer,
    ProductUpdateSerializer,
)

class ProductViewSet(ViewSet):

    def __init__(self, repository: IProductRepository = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or ProductRepository()

    def list(self, request):
        """
        Obtiene todos los productos y, si hay filtros, obtiene con ellos.
        Query params soportados: description, category, container_type
        """
        serializer = ProductQueryParamsSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        description = serializer.validated_data.get("description", None)
        category = serializer.validated_data.get("category", None)
        container_type = serializer.validated_data.get("container_type", None)

        try:
            products = self.repository.get_all(
                description=description, category=category, container_type=container_type
            )
            response_serializer = ProductSerializer(products, many=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"detail": "Error al obtener los productos"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        """
        Obtiene un producto por ID.
        """
        try:
            product = self.repository.get_by_id(pk)
            serializer = ProductSerializer(product)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ProductNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response(
                {"detail": "Error al obtener el producto"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        """
        Crea un nuevo producto.
        """
        serializer = ProductCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = self.repository.create(serializer.validated_data)
            response_serializer = ProductSerializer(product)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(
                {"detail": "Error al crear un producto"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, pk=None):
        """
        Actualiza un producto (PUT).
        """
        try:
            product = self.repository.get_by_id(pk)
            serializer = ProductUpdateSerializer(product, data=request.data, partial=False)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_product = self.repository.update(product, serializer.validated_data)
            response_serializer = ProductSerializer(updated_product)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except ProductNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response(
                {"detail": "Error al actualizar el producto"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        """
        Actualiza parcialmente un producto (PATCH).
        """
        try:
            product = self.repository.get_by_id(pk)
            serializer = ProductUpdateSerializer(product, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            updated_product = self.repository.update(product, serializer.validated_data)
            response_serializer = ProductSerializer(updated_product)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except ProductNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response(
                {"detail": "Error al actualizar el producto"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        """
        Elimina un producto si no está asociado a una lista de precios, factura o compra.
        """
        try:
            product_list_prices_repository = ProductPriceListRepository()
            bill_product_repository = BillProductRepository()
            buy_product_repository = BuyProductRepository()

            product = self.repository.get_by_id(pk)

            if product_list_prices_repository.verify_product_on_price_list(pk):
                raise ProductDeletionNotAllowedException(
                    "El producto está asociado a una lista de precios y no puede ser eliminado.",
                    code="price_list",
                )

            if bill_product_repository.verify_product_on_bill(pk):
                raise ProductDeletionNotAllowedException(
                    "El producto está asociado a una factura y no puede ser eliminado.",
                    code="bill",
                )

            if buy_product_repository.verify_product_on_buys(pk):
                raise ProductDeletionNotAllowedException(
                    "El producto está asociado a una compra y no puede ser eliminado.",
                    code="buy",
                )

            self.repository.delete(product)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductDeletionNotAllowedException as e:
            return Response({"detail": e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except ProductNotFoundException as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response(
                {"detail": "Error al eliminar el producto"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
