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
from .exceptions import BillNotFoundException
from .factory import build_bill_service

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
            cliente_id = serializer.validated_data.get('cliente_id')
            bills = self.repository.get_all(cliente_id=cliente_id)

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
        serializer.is_valid(raise_exception=True)

        try:
            bill = self.service.create_bill(serializer.validated_data)

            response_serializer = BillResponseSerializer(bill)
            
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        '''
        Reemplaza los datos de una factura existente (PUT).
        Si se envían ítems, se eliminan los anteriores y se crean los nuevos.
        La cuenta corriente del cliente se ajusta con la diferencia de importes.
        '''
        serializer = BillUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            bill = self.service.update_bill(
                bill_id=pk,
                data=serializer.validated_data
            )

            response_serializer = BillResponseSerializer(bill)

            return Response(response_serializer.data)
            
        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

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
        serializer.is_valid(raise_exception=True)

        try:
            bill = self.service.update_bill(
                bill_id=pk,
                data=serializer.validated_data
            )

            response_serializer = BillResponseSerializer(bill)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response(
                {'detail': 'Error al actualizar la factura.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, pk=None):
        '''
        Elimina una factura.
        '''
        try:
            self.service.delete_bill(bill_id=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except BillNotFoundException as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response(
                {'detail': 'Error al eliminar la factura.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )