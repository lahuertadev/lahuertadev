from .models import TipoGasto
from .interfaces import ITipoGastoRepository

class TipoGastoRepository(ITipoGastoRepository):
    
    def create_type_expense(self, data):
        description = data.get('description')
        if not TipoGasto.objects.filter(descripcion = description).exists():
            type_expense = TipoGasto(**data) #* Forma de pasar un diccionario 
            type_expense.save()
        
    def get_all_type_expenses(self):
        return TipoGasto.objects.all()
