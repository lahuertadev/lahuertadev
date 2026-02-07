from .models import TipoContenedor
from .interfaces import IContainerTypeRepository
from .exceptions import ContainerNotFoundException

class ContainerTypeRepository(IContainerTypeRepository):
    
    def get_all_container_types(self):
        '''
        Obtiene todos los tipos de contenedores.
        '''
        return TipoContenedor.objects.all()
    
    def get_container_by_id(self, id):
        '''
        Obtiene el contenedor por su id.
        '''
        container = TipoContenedor.objects.filter(id=id).first()
        return container
    
    def create_container_type(self, data):
        '''
        Crea un nuevo tipo de contenedor.
        '''
        container = TipoContenedor(**data)
        container.save()
        return container
    
    def modify_container_type(self, container_type, data):
        '''
        Modifica un tipo de contenedor.
        '''
        container_type.descripcion = data.get('descripcion', container_type.descripcion)
        container_type.save()
        return container_type

    def destroy_container_type(self, container_type):
        '''
        Elimina un tipo de contenedor.
        '''
        container_type.delete()
