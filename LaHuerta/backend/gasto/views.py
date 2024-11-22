from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Gasto
from .serializers import ExpenseSerializer, ExpenseCreateSerializer, ExpenseEditSerializer,ExpenseQueryParamsSerializer
from .repositories import ExpenseRepository

class ExpenseViewSet(viewsets.ModelViewSet):
    '''
    Gestión de gastos
    '''

    expense_repository = ExpenseRepository()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        """
        Sobrescribe el método para utilizar el repositorio.
        """
        return self.expense_repository.get_all_expenses()

    def list (self, request):
        '''
        Obtiene todos los gastos y si hay filtros, obtiene con ellos.
        '''
        serializer = ExpenseQueryParamsSerializer(data=request.query_params)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        amount = serializer.validated_data.get('amount', None)
        date = serializer.validated_data.get('date', None)
        expense_type = serializer.validated_data.get('expense_type', None)

        expenses = self.expense_repository.get_all_expenses(amount=amount, date=date, expense_type=expense_type)
        expenses_serialized = ExpenseSerializer(expenses, many=True)
        return Response(expenses_serialized.data)

    def create (self, request):
        '''
        Crea un nuevo gasto.
        '''
        serializer = ExpenseCreateSerializer(data=request.data)

        if serializer.is_valid():
            try:
                self.expense_repository.create_expense(serializer.validated_data)
                return Response(status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update (self, request, pk=None):
        '''
        Actualiza un gasto
        '''
        serializer = ExpenseEditSerializer(data=request.data)
        if serializer.is_valid():
            try:
                self.expense_repository.modify_expense(pk, serializer.validated_data)
                return Response(status=status.HTTP_200_OK)
            except Gasto.DoesNotExist:
                return Response({'error': 'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        '''
        Elimina un gasto por su ID.
        '''
        try:
            self.expense_repository.delete_expense(pk)

            return Response({'message': 'Gasto eliminado exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        except Gasto.DoesNotExist:
            return Response({'error': 'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['delete'], url_path='bulk_delete')
    def bulk_delete(self, request):
        '''
        Elimina varios gastos por sus IDs.
        '''

        ids = request.data.get('ids', [])
        print('Estos son los ids: ', ids)
        if not ids:
            print('Entre en el if')
            return Response({'error': 'No se proporcionaron IDs'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            self.expense_repository.bulk_delete_expenses(ids)
            return Response({'message': 'Gastos eliminados exitosamente'}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)