from rest_framework import viewsets, status
from rest_framework.response import Response
from .repositories import ClientPaymentRepository
from .interfaces import IClientPaymentRepository
from .service import ClientPaymentService
from .serializers import (
    ClientPaymentResponseSerializer,
    ClientPaymentSerializer,
    ClientPaymentQueryParamsSerializer,
)
from .exceptions import ClientPaymentNotFoundException, PaymentTypeChangeBlockedException
from .factory import build_client_payment_service


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
        Lista todos los pagos. Acepta ?client_id= para filtrar por cliente.
        '''
        params_serializer = ClientPaymentQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        try:
            client_id = params_serializer.validated_data.get('client_id')
            payments = self.repository.get_all(client_id=client_id)
            serializer = ClientPaymentResponseSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            raise Exception(e, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de un pago con sus imputaciones a facturas.
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

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Edita un pago (PUT). Ajusta la cuenta corriente si cambia el importe o el cliente.
        '''
        serializer = ClientPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.update_payment(payment_id=pk,data=serializer.validated_data)
            response_serializer = ClientPaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except ClientPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except PaymentTypeChangeBlockedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
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

        except PaymentTypeChangeBlockedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina un pago y revierte el descuento en la cuenta corriente del cliente.
        '''
        try:
            self.service.delete_payment(payment_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except ClientPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
