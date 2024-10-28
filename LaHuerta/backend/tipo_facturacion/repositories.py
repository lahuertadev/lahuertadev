from .models import TipoFacturacion
from .interfaces import ITipoFacturacionRepository

class TipoFacturacionRepository(ITipoFacturacionRepository):
    
    def create_facturation_type(self, data):
        description = data.get('description')
        if not TipoFacturacion.objects.filter(descripcion = description).exists():
            type_expense = TipoFacturacion(**data)
            type_expense.save()
        
    def get_all_facturation_types(self):
        return TipoFacturacion.objects.all()