from .models import Localidad
from .interfaces import ITownRepository

class TownRepository(ITownRepository):
    
    def get_all_towns(self):
        '''
        Obtiene todos las localidades.
        '''
        return Localidad.objects.all()