from rest_framework import viewsets, status
from rest_framework.response import Response
from .repositories import BuyRepository
from .interfaces import IBuyRepository
from .service import BuyService
from .serializers import (
    BuyResponseSerializer,
    BuyCreateSerializer,
    BuyUpdateSerializer,
    BuyQueryParamsSerializer,
)
from .exceptions import BuyNotFoundException
from .factory import build_buy_service


class BuyViewSet(viewsets.ViewSet):
    '''
    Gestión de compras a proveedores.
    '''

    def __init__(self, repository: IBuyRepository = None, service: BuyService = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or BuyRepository()
        self.service = service or build_buy_service(
            buy_repository=self.repository
        )

    def list(self, request):
        '''
        Lista todas las compras. Acepta filtros por proveedor_id, fechas e importe.
        '''
        serializer = BuyQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            buys = self.repository.get_all(
                proveedor_id=serializer.validated_data.get('proveedor_id'),
                fecha_desde=serializer.validated_data.get('fecha_desde'),
                fecha_hasta=serializer.validated_data.get('fecha_hasta'),
                importe_min=serializer.validated_data.get('importe_min'),
                importe_max=serializer.validated_data.get('importe_max'),
            )

            response_serializer = BuyResponseSerializer(buys, many=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            return Response({'detail': 'Error al obtener las compras.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de una compra con sus ítems.
        '''
        try:
            buy = self.repository.get_by_id(pk)

            if not buy:
                raise BuyNotFoundException('Compra no encontrada.')

            serializer = BuyResponseSerializer(buy)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except BuyNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al obtener la compra.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        '''
        Registra una compra con sus ítems y actualiza la cuenta corriente del proveedor.
        El importe se calcula como: Σ(cantidad_producto × precio_bulto) - senia.
        '''
        serializer = BuyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            buy = self.service.create_buy(serializer.validated_data)

            response_serializer = BuyResponseSerializer(buy)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Reemplaza los datos de una compra existente (PUT).
        Si se envían ítems se eliminan los anteriores y se crean los nuevos.
        La cuenta corriente del proveedor se ajusta con la diferencia de importes.
        '''
        serializer = BuyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            buy = self.service.update_buy(
                buy_id=pk,
                data=serializer.validated_data,
            )

            response_serializer = BuyResponseSerializer(buy)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except BuyNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al actualizar la compra.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, pk=None):
        '''
        Actualización parcial de una compra (PATCH).
        Solo se modifican los campos enviados.
        '''
        serializer = BuyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            buy = self.service.update_buy(
                buy_id=pk,
                data=serializer.validated_data,
            )

            response_serializer = BuyResponseSerializer(buy)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except BuyNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al actualizar la compra.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        '''
        Elimina una compra y revierte el importe de la cuenta corriente del proveedor.
        '''
        try:
            self.service.delete_buy(buy_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except BuyNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al eliminar la compra.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
