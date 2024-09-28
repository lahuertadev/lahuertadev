from rest_framework.views import APIView #! Esto es para realizar una API. 
from rest_framework.response import Response
from rest_framework import status
from .models import Gasto
from .serializers import GastoSerializer, GastoCreateSerializer
from .repositories import GastoRepository


class ExpensesListAPIView(APIView):
    '''
    Obtiene la lista de los gastos.
    '''
    #! Constructor
    def __init__(self, gasto_repository=None):
        self.gasto_repository = gasto_repository or GastoRepository()

    #! Método
    def get(self, request):
        expenses = self.gasto_repository.get_all_expenses()
        serializer = GastoSerializer(expenses, many=True)
        return Response(serializer.data)
    
class ExpensesByExpenseTypeIdAPIView(APIView):
    '''
    Obtiene los gastos por el Id de tipo gasto usando la interfaz IGastoRepository
    '''
    def __init__(self, gasto_repository=None):
        self.gasto_repository = gasto_repository or GastoRepository()

    def get(self, request, tipo_gasto_id):
        gastos = self.gasto_repository.get_expenses_by_type_expenses_id(tipo_gasto_id)
        serializer = GastoSerializer(gastos, many=True)
        return Response(serializer.data)
    
class CreateExpensesAPIView(APIView):
    '''
    Crea un nuevo gasto
    '''
    def __init__(self, gasto_repository=None):
        self.gasto_repository = gasto_repository or GastoRepository()

    def post(self, request):
        serializer = GastoCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                self.gasto_repository.create_expense(serializer.validated_data)
                return Response(status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)