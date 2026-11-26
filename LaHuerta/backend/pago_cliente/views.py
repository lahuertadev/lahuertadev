import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import ClientPaymentRepository
from .interfaces import IClientPaymentRepository
from .service import ClientPaymentService
from .serializers import (
    ClientPaymentResponseSerializer,
    ClientPaymentSerializer,
    ClientPaymentQueryParamsSerializer,
    ClientPaymentCancelSerializer,
)
from .exceptions import (
    ClientPaymentNotFoundException,
    CheckAlreadyExistsException,
    PaymentCancelBlockedException,
    PaymentEditBlockedException,
    CheckEditBlockedException,
)
from .factory import build_client_payment_service

logger = logging.getLogger(__name__)


class ClientPaymentViewSet(viewsets.ViewSet):
    '''
    Gestión de pagos de clientes.
    '''

    def __init__(self, repository: IClientPaymentRepository = None, service: ClientPaymentService = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or ClientPaymentRepository()
        self.service = service or build_client_payment_service(
            payment_repository=self.repository
        )

    def list(self, request):
        '''
        Lista todos los pagos. Acepta filtros por cliente, importe, fecha, tipo de pago y estado.
        '''
        params_serializer = ClientPaymentQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        try:
            payments = self.repository.get_all(**params_serializer.validated_data)
            serializer = ClientPaymentResponseSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Error al listar pagos de cliente")
            return Response(
                {'detail': 'Error al obtener los pagos.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un pago con su cheque, si tiene.
        '''
        try:
            payment = self.repository.get_by_id(pk)
            if not payment:
                raise ClientPaymentNotFoundException('Pago no encontrado.')

            serializer = ClientPaymentResponseSerializer(payment)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ClientPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            logger.exception("Error al obtener pago de cliente pk=%s", pk)
            return Response(
                {'detail': 'Error al obtener el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Registra un pago de cliente y actualiza la cuenta corriente del mismo.
        '''
        serializer = ClientPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.create_payment(serializer.validated_data)
            response_serializer = ClientPaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except CheckAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al crear pago de cliente")
            return Response(
                {'detail': 'Error al crear el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, pk=None):
        '''
        Edita un pago (PUT). Ajusta la cuenta corriente si cambia el importe o el cliente.
        '''
        serializer = ClientPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.update_payment(payment_id=pk, data=serializer.validated_data)
            response_serializer = ClientPaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except ClientPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except (CheckEditBlockedException, PaymentEditBlockedException) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al actualizar pago de cliente pk=%s", pk)
            return Response(
                {'detail': 'Error al actualizar el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Edita parcialmente un pago (PATCH). Solo se modifican los campos enviados.
        '''
        serializer = ClientPaymentSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.update_payment(
                payment_id=pk,
                data=serializer.validated_data,
            )
            response_serializer = ClientPaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except ClientPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except CheckAlreadyExistsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except (CheckEditBlockedException, PaymentEditBlockedException) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al actualizar pago de cliente pk=%s", pk)
            return Response(
                {'detail': 'Error al actualizar el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        '''
        Anula el pago. Queda como registro con estado Anulado.
        '''
        serializer = ClientPaymentCancelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.cancel_payment(payment_id=pk, reason=serializer.validated_data['motivo'])
            return Response(ClientPaymentResponseSerializer(payment).data, status=status.HTTP_200_OK)

        except ClientPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except PaymentCancelBlockedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al anular pago de cliente pk=%s", pk)
            return Response(
                {'detail': 'Error al anular el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
