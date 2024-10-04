from typing import Any
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import TipoGastoSerializer
from .repositories import TipoGastoRepository

class CreateTypeExpenseAPIView(APIView):
    '''
    Crea un nuevo tipo de gasto
    '''
    def __init__(self, type_expense_repository=None):
        self.type_expense_repository = type_expense_repository or ITipoGastoRepository()

    def post(self, request):
        serializer = TipoGastoSerializer(data=request.data)
        if serializer.is_valid():
            try:
                self.type_expense_repository.create_type_expense(serializer.validated_data)
                return Response(status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error':str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class GetTypeExpensesAPIView(APIView):
    '''
    Lista todos los tipos de gastos
    '''

    def __init__(self, type_expense_repository = None):
        self.type_expense_repository = type_expense_repository or TipoGastoRepository()

    def get(self, request):
        try:
            type_expenses = self.type_expense_repository.get_all_type_expenses()
            serializer = TipoGastoSerializer(type_expenses, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        