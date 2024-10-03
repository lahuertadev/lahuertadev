from datetime import datetime
from rest_framework.views import APIView #! Esto es para realizar una API. 
from rest_framework.response import Response
from rest_framework import status
from .models import Gasto
from .serializers import (
    ExpenseSerializer, 
    ExpenseCreateSerializer, 
    ExpenseEditSerializer, 
)
from .repositories import ExpenseRepository


class ExpensesListAPIView(APIView):
    '''
    Obtiene la lista de los gastos.
    '''
    #! Constructor
    def __init__(self, expense_repository=None):
        self.expense_repository = expense_repository or ExpenseRepository()

    #! Método
    def get(self, request):
        expenses = self.expense_repository.get_all_expenses()
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)
    
class ExpensesByExpenseTypeIdAPIView(APIView):
    '''
    Obtiene los gastos por el Id de tipo gasto usando la interfaz IGastoRepository
    '''
    def __init__(self, expense_repository=None):
        self.expense_repository = expense_repository or ExpenseRepository()

    def get(self, request, *args, **kwargs):
        type_expense_id = kwargs.get('type_expense_id')
        try:
            gastos = self.expense_repository.get_expenses_by_type_expenses_id(type_expense_id)
            serializer = ExpenseSerializer(gastos, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
class CreateExpensesAPIView(APIView):
    '''
    Crea un nuevo gasto
    '''
    def __init__(self, expense_repository=None):
        self.expense_repository = expense_repository or ExpenseRepository()

    def post(self, request):
        serializer = ExpenseCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                self.expense_repository.create_expense(serializer.validated_data)
                return Response(status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ModifyExpenseAPIView(APIView):
    '''
    Modifica un gasto
    '''
    def __init__(self, expense_repository=None):
        self.expense_repository = expense_repository or ExpenseRepository()

    def put(self, request, *args, **kwargs):
        expense_id = kwargs.get('id') #* Así se obtiene un parámetro desde la URL
        serializer = ExpenseEditSerializer(data=request.data)
        if serializer.is_valid():
            try:
                self.expense_repository.modify_expense(expense_id, serializer.validated_data)
                return Response(status=status.HTTP_200_OK)
            except Gasto.DoesNotExist:
                return Response({'error': 'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class DeleteExpenseAPIView(APIView):
    '''
    Elimina un gasto
    '''

    def __init__(self, expense_repository=None):
        self.expense_repository = expense_repository or ExpenseRepository()

    def delete(self, request, *args, **kwargs):
        expense_id = kwargs.get('id')
        try:
            self.expense_repository.delete_expense(expense_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Gasto.DoesNotExist:
            return Response({'error':'Gasto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
class GetExpensesByDateAPIView(APIView):
    '''
    Obtiene los gastos entre las fechas especificadas
    '''
    def __init__(self, expense_repository=None):
        self.expense_repository = expense_repository or ExpenseRepository()

    def get(self, request, *args, **kwargs):
        start_date = kwargs.get('start_date').strip()
        end_date = kwargs.get('end_date').strip()
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        try:
            expenses = self.expense_repository.get_expenses_filtered_by_date(start_date, end_date)
            serializer = ExpenseSerializer(expenses, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)