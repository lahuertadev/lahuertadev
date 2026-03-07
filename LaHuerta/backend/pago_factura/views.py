from rest_framework import viewsets, status
from rest_framework.response import Response
from .repositories import BillPaymentRepository
from .interfaces import IBillPaymentRepository
from .service import BillPaymentService
from .serializers import (
    BillPaymentResponseSerializer,
    BillPaymentCreateSerializer,
    BillPaymentUpdateSerializer,
    BillPaymentQueryParamsSerializer,
)
from .exceptions import BillPaymentNotFoundException, BillPaymentValidationException
from .factory import build_bill_payment_service


class BillPaymentViewSet(viewsets.ViewSet):
    '''
    Gestión de imputaciones de pagos a facturas.
    '''

    def __init__(self, repository: IBillPaymentRepository = None, service: BillPaymentService = None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or BillPaymentRepository()
        self.service = service or build_bill_payment_service(
            bill_payment_repository=self.repository
        )

    def list(self, request):
        '''
        Lista todas las imputaciones. Acepta ?payment_id= y ?bill_id= para filtrar.
        '''
        params_serializer = BillPaymentQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        try:
            payment_id = params_serializer.validated_data.get('payment_id')
            bill_id = params_serializer.validated_data.get('bill_id')
            records = self.repository.get_all(payment_id=payment_id, bill_id=bill_id)
            serializer = BillPaymentResponseSerializer(records, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {'detail': 'Error al obtener las imputaciones.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de una imputación.
        '''
        try:
            record = self.repository.get_by_id(pk)
            if not record:
                raise BillPaymentNotFoundException('Imputación no encontrada.')

            serializer = BillPaymentResponseSerializer(record)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except BillPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener la imputación.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        '''
        Imputa un pago a una factura.
        Valida que la factura pertenezca al cliente del pago y que el importe
        no supere el saldo pendiente de la factura.
        '''
        serializer = BillPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            record = self.service.create_bill_payment(serializer.validated_data)
            response_serializer = BillPaymentResponseSerializer(record)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except BillPaymentValidationException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Edita el importe abonado de una imputación (PUT).
        '''
        serializer = BillPaymentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            record = self.service.update_bill_payment(
                record_id=pk,
                data=serializer.validated_data,
            )
            response_serializer = BillPaymentResponseSerializer(record)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except BillPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BillPaymentValidationException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar la imputación.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, pk=None):
        '''
        Edita parcialmente el importe abonado (PATCH).
        '''
        serializer = BillPaymentUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            record = self.service.update_bill_payment(
                record_id=pk,
                data=serializer.validated_data,
            )
            response_serializer = BillPaymentResponseSerializer(record)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except BillPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BillPaymentValidationException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response(
                {'detail': 'Error al actualizar la imputación.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        '''
        Elimina una imputación.
        '''
        try:
            self.service.delete_bill_payment(record_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except BillPaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar la imputación.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
