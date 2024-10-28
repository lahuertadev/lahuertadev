from .models import TipoCondicionIva
from .interfaces import ITypeConditionIvaRepository

class TypeConditionIvaRepository(ITypeConditionIvaRepository):
    
    def get_all_type_condition_iva(self):
        return TipoCondicionIva.objects.all()
    
    # def create_facturation_type(self, data):
    #     description = data.get('description')
    #     if not TipoFacturacion.objects.filter(descripcion = description).exists():
    #         type_expense = TipoFacturacion(**data)
    #         type_expense.save()
        