from .models import TipoUnidad
from .interfaces import IUnitTypeRepository

class UnitTypeRepository(IUnitTypeRepository):
    
    def get_all_unit_types(self):
        '''
        Obtiene todos los tipos de unidad.
        '''
        return TipoUnidad.objects.all()