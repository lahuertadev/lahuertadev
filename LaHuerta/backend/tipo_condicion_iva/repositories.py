from .models import TipoCondicionIva
from .interfaces import IConditionIvaTypeRepository

class ConditionIvaTypeRepository(IConditionIvaTypeRepository):
    
    def get_all(self):
        return TipoCondicionIva.objects.all()

    def create(self, data):
        return TipoCondicionIva.objects.create(**data)
    
        