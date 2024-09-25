from .models import Gasto
from .interfaces import IGastoRepository

class GastoRepository(IGastoRepository):
    def get_gastos_by_tipo_gasto_id(self, tipo_gasto_id):
        return Gasto.objects.filter(tipo_gasto_id=tipo_gasto_id)
    
    def get_all_expenses(self):
        return Gasto.objects.all()