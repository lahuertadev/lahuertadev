from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import CheckRepository
from .interfaces import ICheckRepository
from .serializers import CheckWriteSerializer, CheckResponseSerializer, EndorseCheckSerializer
from .exceptions import CheckNotFoundException, CheckAlreadyEndorsedException, CheckInvalidStateException
from .factory import build_check_service


class CheckViewSet(viewsets.ViewSet):
    '''
    Gestión de cheques.
    '''

    def __init__(self, repository: ICheckRepository = None, service=None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or CheckRepository()
        self.service = service or build_check_service(check_repository=self.repository)

    def list(self, request):
        '''
        Lista todos los cheques.
        '''
        try:
            checks = self.repository.get_all()
            serializer = CheckResponseSerializer(checks, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un cheque.
        '''
        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            serializer = CheckResponseSerializer(check)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Registra un cheque nuevo.
        '''
        serializer = CheckWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            check = self.repository.create(serializer.validated_data)
            response_serializer = CheckResponseSerializer(check)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Edita un cheque (PUT).
        '''
        serializer = CheckWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            check = self.repository.update(check, serializer.validated_data)
            response_serializer = CheckResponseSerializer(check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Edita parcialmente un cheque (PATCH).
        '''
        serializer = CheckWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            check = self.repository.update(check, serializer.validated_data)
            response_serializer = CheckResponseSerializer(check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un cheque.
        '''
        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            self.repository.delete(check)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='endorse')
    def endorse(self, request, pk=None):
        '''
        Endosa un cheque a un pago de compra.
        '''
        serializer = EndorseCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            check = self.service.endorse_check(
                check=check,
                pago_compra=serializer.validated_data['pago_compra'],
            )
            response_serializer = CheckResponseSerializer(check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckAlreadyEndorsedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except CheckInvalidStateException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Error al endosar el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
