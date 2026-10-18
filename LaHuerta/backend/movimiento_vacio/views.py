import logging
from rest_framework import viewsets, status
from rest_framework.response import Response
from .repositories import EmptyMovementRepository
from .interfaces import IEmptyMovementRepository
from .service import EmptyMovementService
from .serializers import (
    EmptyMovementResponseSerializer,
    EmptyMovementCreateSerializer,
    EmptyMovementUpdateSerializer,
    EmptyMovementQueryParamsSerializer,
)
from .exceptions import EmptyMovementNotFoundException
from .factory import build_empty_movement_service

logger = logging.getLogger(__name__)


class EmptyMovementViewSet(viewsets.ViewSet):
    '''
    Gestión de cargas y devoluciones de vacíos de proveedores.
    '''

    def __init__(self, repository: IEmptyMovementRepository = None, service: EmptyMovementService = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or EmptyMovementRepository()
        self.service = service or build_empty_movement_service(
            empty_movement_repository=self.repository
        )

    def list(self, request):
        '''
        Lista los movimientos de vacíos. Acepta filtros por nombre de proveedor, tipo, fechas e importe.
        '''
        serializer = EmptyMovementQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            movements = self.repository.get_all(
                supplier_name=serializer.validated_data.get('proveedor'),
                movement_type=serializer.validated_data.get('tipo'),
                date_from=serializer.validated_data.get('fecha_desde'),
                date_to=serializer.validated_data.get('fecha_hasta'),
                amount=serializer.validated_data.get('importe'),
            )

            response_serializer = EmptyMovementResponseSerializer(movements, many=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Error al listar movimientos de vacíos")
            return Response({'detail': 'Error al obtener los movimientos de vacíos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un movimiento de vacíos con sus renglones.
        '''
        try:
            movement = self.repository.get_by_id(pk)

            if not movement:
                raise EmptyMovementNotFoundException('Movimiento de vacíos no encontrado.')

            serializer = EmptyMovementResponseSerializer(movement)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except EmptyMovementNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al obtener movimiento de vacíos pk=%s", pk)
            return Response({'detail': 'Error al obtener el movimiento de vacíos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        '''
        Registra una carga o devolución de vacíos y actualiza la cuenta corriente del proveedor.
        CARGA suma el importe a la CC; DEVOLUCION lo resta.
        '''
        serializer = EmptyMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            movement = self.service.create_movement(serializer.validated_data)

            response_serializer = EmptyMovementResponseSerializer(self.repository.get_by_id(movement.id))
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception:
            logger.exception("Error al crear movimiento de vacíos")
            return Response({'detail': 'Error al crear el movimiento de vacíos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Reemplaza el movimiento de vacíos completo
        '''
        serializer = EmptyMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            movement = self.service.update_movement(
                movement_id=pk,
                data=serializer.validated_data,
            )

            response_serializer = EmptyMovementResponseSerializer(self.repository.get_by_id(movement.id))
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except EmptyMovementNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al actualizar movimiento de vacíos pk=%s", pk)
            return Response({'detail': 'Error al actualizar el movimiento de vacíos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, pk=None):
        '''
        Actualización parcial 
        '''
        serializer = EmptyMovementUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            movement = self.service.update_movement(
                movement_id=pk,
                data=serializer.validated_data,
            )

            response_serializer = EmptyMovementResponseSerializer(self.repository.get_by_id(movement.id))
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except EmptyMovementNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al actualizar movimiento de vacíos pk=%s", pk)
            return Response({'detail': 'Error al actualizar el movimiento de vacíos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        '''
        Elimina un movimiento de vacíos y revierte su efecto en la cuenta corriente del proveedor.
        '''
        try:
            self.service.delete_movement(movement_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except EmptyMovementNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al eliminar movimiento de vacíos pk=%s", pk)
            return Response({'detail': 'Error al eliminar el movimiento de vacíos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
