from .models import TipoContenedor
from .interfaces import IContainerTypeRepository

class ContainerTypeRepository(IContainerTypeRepository):
    
    def get_all_container_types(self):
        '''
        Obtiene todos los tipos de contenedores.
        '''
        return TipoContenedor.objects.all()