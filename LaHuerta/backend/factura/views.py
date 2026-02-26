from rest_framework import viewsets, status
from rest_framework.response import Response
from .repositories import BillRepository
from .serializers import (
    BillResponseSerializer,
    BillCreateSerializer,
    BillUpdateSerializer,
    BillQueryParamsSerializer,
)


class BillViewSet(viewsets.ModelViewSet):
    '''
    Gestión de facturas.
    '''
    bill_repository = BillRepository()
    serializer_class = BillResponseSerializer

    def get_queryset(self):
        return self.bill_repository.get_all_bills()

    def list(self, request):
        '''
        Lista todas las facturas. Acepta ?cliente_id= para filtrar por cliente.
        '''
        params_serializer = BillQueryParamsSerializer(data=request.query_params)
        if not params_serializer.is_valid():
            return Response(params_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cliente_id = params_serializer.validated_data.get('cliente_id')
        bills = self.bill_repository.get_all_bills(cliente_id=cliente_id)
        serializer = BillResponseSerializer(bills, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        '''
        Devuelve el detalle de una factura con sus ítems.
        '''
        bill = self.bill_repository.get_bill_by_id(pk)
        if not bill:
            return Response({'detail': 'Factura no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BillResponseSerializer(bill)
        return Response(serializer.data)

    def create(self, request):
        '''
        Crea una nueva factura con sus ítems y actualiza la cuenta corriente del cliente.
        El importe total se calcula automáticamente a partir de cantidad × precio_unitario de cada ítem.
        '''
        serializer = BillCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            bill = self.bill_repository.create_bill(dict(serializer.validated_data))
            response_serializer = BillResponseSerializer(bill)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            bill = self.bill_repository.update_bill(pk, dict(serializer.validated_data))
            response_serializer = BillResponseSerializer(bill)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        '''
        Actualización parcial de una factura (PATCH).
        Solo se modifican los campos enviados.
        '''
        serializer = BillUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            bill = self.bill_repository.update_bill(pk, dict(serializer.validated_data))
            response_serializer = BillResponseSerializer(bill)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
