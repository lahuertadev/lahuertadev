from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import CheckRepository
from .interfaces import ICheckRepository
from .serializers import CheckWriteSerializer, CheckResponseSerializer, EndorseCheckSerializer, CheckQueryParamsSerializer
from .exceptions import CheckNotFoundException, CheckAlreadyEndorsedException, CheckInvalidStateException, CheckLinkedToPaymentException, CheckInvalidTransitionException
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
        Lista todos los cheques. Acepta filtros por banco, estado, endosado y rango de fecha_deposito.
        '''
        params_serializer = CheckQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data

        endosado_raw = params.get('endosado')
        endosado = None
        if endosado_raw == 'true':
            endosado = True
        elif endosado_raw == 'false':
            endosado = False

        try:
            checks = self.repository.get_all(
                banco=params.get('banco'),
                estado=params.get('estado'),
                endosado=endosado,
                fecha_deposito_desde=params.get('fecha_deposito_desde'),
                fecha_deposito_hasta=params.get('fecha_deposito_hasta'),
            )
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
        Edita un cheque (PUT). No se permite si está asociado a un pago.
        '''
        serializer = CheckWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            if check.pago_cliente_id or check.pago_compra_id:
                raise CheckLinkedToPaymentException(
                    'No se puede editar el cheque porque está asociado a un pago. '
                    'Editá el pago correspondiente.'
                )

            check = self.repository.update(check, serializer.validated_data)
            response_serializer = CheckResponseSerializer(check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckLinkedToPaymentException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Edita parcialmente un cheque (PATCH). No se permite si está asociado a un pago.
        '''
        serializer = CheckWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            if check.pago_cliente_id or check.pago_compra_id:
                raise CheckLinkedToPaymentException(
                    'No se puede editar el cheque porque está asociado a un pago. '
                    'Editá el pago correspondiente.'
                )

            check = self.repository.update(check, serializer.validated_data)
            response_serializer = CheckResponseSerializer(check)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckLinkedToPaymentException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el cheque.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un cheque. No se permite si está asociado a un pago de cliente o de compra.
        '''
        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            if check.pago_cliente_id:
                raise CheckLinkedToPaymentException(
                    'No se puede eliminar el cheque porque está asociado a un pago de cliente. '
                    'Eliminá primero el pago correspondiente.'
                )

            if check.pago_compra_id:
                raise CheckLinkedToPaymentException(
                    'No se puede eliminar el cheque porque está asociado a un pago de compra. '
                    'Eliminá primero el pago correspondiente.'
                )

            self.repository.delete(check)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckLinkedToPaymentException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=True, methods=['post'], url_path='deposit')
    def deposit(self, request, pk=None):
        '''
        Deposita un cheque (EN_CARTERA → DEPOSITADO).
        '''
        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            check = self.service.deposit_check(check)
            return Response(CheckResponseSerializer(check).data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckInvalidTransitionException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response({'detail': 'Error al depositar el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='credit')
    def credit(self, request, pk=None):
        '''
        Acredita un cheque (DEPOSITADO → ACREDITADO).
        '''
        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            check = self.service.credit_check(check)
            return Response(CheckResponseSerializer(check).data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckInvalidTransitionException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response({'detail': 'Error al acreditar el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        '''
        Rechaza un cheque (DEPOSITADO → RECHAZADO).
        '''
        try:
            check = self.repository.get_by_id(pk)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')

            check = self.service.reject_check(check)
            return Response(CheckResponseSerializer(check).data, status=status.HTTP_200_OK)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckInvalidTransitionException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response({'detail': 'Error al rechazar el cheque.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
