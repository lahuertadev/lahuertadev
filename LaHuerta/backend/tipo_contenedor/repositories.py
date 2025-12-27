from .models import TipoContenedor
from .interfaces import IContainerTypeRepository
from .exceptions import ContainerHasProductsException, ContainerNotFoundException
from producto.repositories import ProductRepository

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
    
    def modify_container_type(self, id, data):
        '''
        Modifica un tipo de contenedor.
        '''
        container = self.get_container_by_id(id)
        if not container:
            raise ContainerNotFoundException('Tipo de contenedor no encontrado.')
        
        container.descripcion = data.get('descripcion', container.descripcion)
        container.save()
        return container

    def destroy_container_type(self, id):
        '''
        Elimina un tipo de contenedor.
        '''
        container = self.get_container_by_id(id)
        container.delete()
