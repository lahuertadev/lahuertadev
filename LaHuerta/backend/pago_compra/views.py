from rest_framework import viewsets, status
from rest_framework.response import Response
from .interfaces import IPurchasePaymentRepository
from .repositories import PurchasePaymentRepository
from .serializers import (
    PurchasePaymentWriteSerializer,
    PurchasePaymentResponseSerializer,
    PurchasePaymentQueryParamsSerializer,
)
from .exceptions import PurchasePaymentNotFoundException, PaymentExceedsBalanceException
from .factory import build_purchase_payment_service
from cheque.exceptions import CheckNotFoundException, CheckAlreadyEndorsedException, CheckInvalidStateException


class PurchasePaymentViewSet(viewsets.ViewSet):
    '''
    Gestión de pagos de compras a proveedores.
    '''

    def __init__(self, repository: IPurchasePaymentRepository = None, service=None, **kwargs):
        super().__init__(**kwargs)
        self.repository = repository or PurchasePaymentRepository()
        self.service = service or build_purchase_payment_service()

    def list(self, request):
        params_serializer = PurchasePaymentQueryParamsSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)

        try:
            compra_id = params_serializer.validated_data.get('compra_id')
            payments = self.repository.get_all(compra_id=compra_id)
            serializer = PurchasePaymentResponseSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        try:
            payment = self.repository.get_by_id(pk)
            if not payment:
                raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')

            serializer = PurchasePaymentResponseSerializer(payment)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except PurchasePaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al obtener el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        serializer = PurchasePaymentWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.create_payment(serializer.validated_data)
            response_serializer = PurchasePaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except CheckNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except (CheckAlreadyEndorsedException, CheckInvalidStateException, PaymentExceedsBalanceException) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        try:
            self.service.delete_payment(payment_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except PurchasePaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response(
                {'detail': 'Error al eliminar el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
