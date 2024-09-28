from .models import Gasto
from .interfaces import IGastoRepository

class GastoRepository(IGastoRepository):
    def get_expenses_by_type_expenses_id(self, tipo_gasto_id):
        return Gasto.objects.filter(tipo_gasto_id=tipo_gasto_id)
    
    def get_all_expenses(self):
        return Gasto.objects.all()
    
    def create_expense(self, data):
        expense = Gasto(**data)
        expense.save()