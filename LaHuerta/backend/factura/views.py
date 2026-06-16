import logging
from rest_framework import viewsets, status
from rest_framework.response import Response
from .repositories import BillRepository
from .interfaces import IBillRepository
from .service import BillService
from .serializers import (
    BillResponseSerializer,
    BillCreateSerializer,
    BillUpdateSerializer,
    BillQueryParamsSerializer,
)
from .exceptions import BillNotFoundException, BillHasPaymentsException, BillAlreadyEmittedException, PriceNotFoundError, DebitNoteValidationError, CreditNoteValidationError
from .factory import build_bill_service
from arca.exceptions import WSAAAuthenticationError, WSFEEmissionError

logger = logging.getLogger(__name__)

class BillViewSet(viewsets.ViewSet):
    '''
    Gestión de facturas.
    '''

    def __init__(self, repository: IBillRepository = None, service = None,**kwargs):
        super().__init__(**kwargs)
        self.repository = repository or BillRepository()
        self.service = service or build_bill_service(
            bill_repository = self.repository
        )

    def list(self, request):
        '''
        Lista todas las facturas. Acepta ?cliente_id= para filtrar por cliente.
        '''
        serializer = BillQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            bills = self.repository.get_all(
                client_id=serializer.validated_data.get('client_id'),
                cuit=serializer.validated_data.get('cuit'),
                business_name=serializer.validated_data.get('business_name'),
                amount_min=serializer.validated_data.get('amount_min'),
                amount_max=serializer.validated_data.get('amount_max'),
                date_from=serializer.validated_data.get('date_from'),
                date_to=serializer.validated_data.get('date_to'),
                bill_type_id=serializer.validated_data.get('bill_type_id'),
            )

            response_serializer = BillResponseSerializer(bills, many=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            return Response({'detail': 'Error al obtener las facturas.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de una factura con sus ítems.
        '''
        try: 
            bill = self.repository.get_by_id(pk)
            
            if not bill:
                raise BillNotFoundException('Factura no encontrada.')

            serializer = BillResponseSerializer(bill)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception:
            return Response({'detail': 'Error al obtener la factura.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        '''
        Crea una nueva factura con sus ítems y actualiza la cuenta corriente del cliente.
        El importe total se calcula automáticamente a partir de cantidad × precio_unitario de cada ítem.
        '''
        serializer = BillCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            bill = self.service.create_bill(serializer.validated_data)
            response_serializer = BillResponseSerializer(bill)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except (PriceNotFoundError, DebitNoteValidationError, CreditNoteValidationError) as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except (WSAAAuthenticationError, WSFEEmissionError) as e:
            logger.error("Error al emitir comprobante AFIP: %s", e)
            return Response(
                {'detail': 'No se pudo emitir el comprobante electrónico. Verificá los datos del cliente y volvé a intentar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Reemplaza los datos de una factura existente (PUT).
        Si se envían ítems, se eliminan los anteriores y se crean los nuevos.
        La cuenta corriente del cliente se ajusta con la diferencia de importes.
        '''
        serializer = BillUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            bill = self.service.update_bill(
                bill_id=pk,
                data=serializer.validated_data
            )

            response_serializer = BillResponseSerializer(bill)

            return Response(response_serializer.data)
            
        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BillAlreadyEmittedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        except Exception as e:
            return Response(
                {'detail': 'Error al actualizar la factura.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, pk=None):
        '''
        Actualización parcial de una factura (PATCH).
        Solo se modifican los campos enviados.
        '''

        serializer = BillUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            bill = self.service.update_bill(
                bill_id=pk,
                data=serializer.validated_data
            )

            response_serializer = BillResponseSerializer(bill)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BillAlreadyEmittedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        except Exception as e:
            return Response(
                {'detail': 'Error al actualizar la factura.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, pk=None):
        '''
        Elimina una factura. Falla con 409 si tiene pagos imputados asociados.
        '''
        try:
            self.service.delete_bill(bill_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except BillAlreadyEmittedException as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        except BillHasPaymentsException as e:
            return Response({'detail': str(e)}, status=status.HTTP_409_CONFLICT)

        except Exception as e:
            return Response(
                {'detail': 'Error al eliminar la factura.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )