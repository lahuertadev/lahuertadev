from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import OwnCheckRepository
from .interfaces import IOwnCheckRepository
from .serializers import OwnCheckWriteSerializer, OwnCheckResponseSerializer, OwnCheckQueryParamsSerializer
from .exceptions import OwnCheckNotFoundException, OwnCheckInvalidTransitionException
from .factory import build_own_check_service


class OwnCheckViewSet(viewsets.ViewSet):
    '''
    Gestión de cheques propios emitidos por La Huerta.
    '''

    def __init__(self, repository: IOwnCheckRepository = None, service=None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or OwnCheckRepository()
        self.service = service or build_own_check_service(own_check_repository=self.repository)

    def list(self, request):
        params_serializer = OwnCheckQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data

        try:
            own_checks = self.repository.get_all(
                estado=params.get('estado'),
                banco=params.get('banco'),
            )
            serializer = OwnCheckResponseSerializer(own_checks, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        try:
            own_check = self.repository.get_by_id(pk)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            serializer = OwnCheckResponseSerializer(own_check)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except OwnCheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al obtener el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        serializer = OwnCheckWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            own_check = self.repository.create(serializer.validated_data)
            response_serializer = OwnCheckResponseSerializer(own_check)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        serializer = OwnCheckWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            own_check = self.repository.get_by_id(pk)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            own_check = self.repository.update(own_check, serializer.validated_data)
            response_serializer = OwnCheckResponseSerializer(own_check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except OwnCheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al actualizar el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, pk=None):
        serializer = OwnCheckWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            own_check = self.repository.get_by_id(pk)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            own_check = self.repository.update(own_check, serializer.validated_data)
            response_serializer = OwnCheckResponseSerializer(own_check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except OwnCheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al actualizar el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        try:
            own_check = self.repository.get_by_id(pk)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            self.repository.delete(own_check)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except OwnCheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al eliminar el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='cash')
    def cash(self, request, pk=None):
        '''
        Marca un cheque propio como cobrado (EMITIDO → COBRADO).
        '''
        try:
            own_check = self.repository.get_by_id(pk)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            own_check = self.service.cash_check(own_check)
            return Response(OwnCheckResponseSerializer(own_check).data, status=status.HTTP_200_OK)

        except OwnCheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except OwnCheckInvalidTransitionException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response({'detail': 'Error al marcar el cheque como cobrado.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        '''
        Anula un cheque propio (EMITIDO → ANULADO).
        '''
        try:
            own_check = self.repository.get_by_id(pk)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            own_check = self.service.cancel_check(own_check)
            return Response(OwnCheckResponseSerializer(own_check).data, status=status.HTTP_200_OK)

        except OwnCheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except OwnCheckInvalidTransitionException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response({'detail': 'Error al anular el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
