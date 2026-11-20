import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .interfaces import IPurchasePaymentRepository
from .repositories import PurchasePaymentRepository
from .serializers import (
    PurchasePaymentCreateSerializer,
    PurchasePaymentUpdateSerializer,
    PurchasePaymentResponseSerializer,
    PurchasePaymentQueryParamsSerializer,
)
from .exceptions import (
    PurchasePaymentNotFoundException,
    PaymentExceedsBalanceException,
    PaymentSupplierMismatchException,
    PaymentEditBlockedException,
    PaymentApplicationsExceedAmountException,
    OwnCheckNotAvailableException,
    PaymentCancelBlockedException,
)
from .factory import build_purchase_payment_service
from cheque.exceptions import CheckNotFoundException, CheckAlreadyEndorsedException, CheckInvalidStateException
from cheque_propio.exceptions import OwnCheckNotFoundException

logger = logging.getLogger(__name__)


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
            params = params_serializer.validated_data
            payments = self.repository.get_all(
                compra_id=params.get('compra_id'),
                supplier_id=params.get('supplier_id'),
                supplier=params.get('supplier'),
                kind=params.get('kind'),
                payment_type_id=params.get('payment_type_id'),
                amount_min=params.get('amount_min'),
                amount_max=params.get('amount_max'),
                date_from=params.get('date_from'),
                date_to=params.get('date_to'),
                state=params.get('estado'),
            )
            serializer = PurchasePaymentResponseSerializer(payments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Error al listar pagos de compras")
            return Response({'detail': 'Error al obtener los pagos.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            logger.exception("Error al obtener pago de compra pk=%s", pk)
            return Response(
                {'detail': 'Error al obtener el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request):
        serializer = PurchasePaymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.create_payment(serializer.validated_data)
            response_serializer = PurchasePaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except (CheckNotFoundException, OwnCheckNotFoundException) as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except (
            CheckAlreadyEndorsedException,
            CheckInvalidStateException,
            PaymentExceedsBalanceException,
            PaymentSupplierMismatchException,
            PaymentApplicationsExceedAmountException,
            OwnCheckNotAvailableException,
        ) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al registrar pago de compra")
            return Response({'detail': 'Error al registrar el pago.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        serializer = PurchasePaymentUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = self.service.update_payment(pk, serializer.validated_data)
            response_serializer = PurchasePaymentResponseSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except PurchasePaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except (
            PaymentExceedsBalanceException,
            PaymentSupplierMismatchException,
            PaymentApplicationsExceedAmountException,
            PaymentEditBlockedException,
        ) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al editar pago de compra pk=%s", pk)
            return Response({'detail': 'Error al editar el pago.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        '''
        Anula el pago (POST .../cancel/). Un pago no se elimina: queda como registro con estado
        Anulado. Ver PurchasePaymentService.cancel_payment.
        '''
        try:
            payment = self.service.cancel_payment(payment_id=pk)
            return Response(PurchasePaymentResponseSerializer(payment).data, status=status.HTTP_200_OK)

        except PurchasePaymentNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except PaymentCancelBlockedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            logger.exception("Error al anular pago de compra pk=%s", pk)
            return Response(
                {'detail': 'Error al anular el pago.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
