from .models import Categoria
from .interfaces import ICategoryRepository
from producto.repositories import ProductRepository
from .exceptions import (
    CategoryHasProductsException, 
    CategoryNotFoundException
)

class CategoryRepository(ICategoryRepository):
    
    def get_all_categories(self, descripcion=None):
        '''
        Obtiene todos los tipos de categorías con filtros opcionales.
        '''
        queryset = Categoria.objects.all()
        
        if descripcion:
            queryset = queryset.filter(descripcion__icontains=descripcion)
        
        return queryset
    
    def create_category(self, data):
        '''
        Crea una nueva categoría.
        '''
        category = Categoria(**data)
        category.save()
        return category
    
    def get_category_by_id(self, id):
        category = Categoria.objects.filter(id=id).first()
        return category

    def modify_category(self, id, data):
        '''
        Modifica una categoría.
        '''
        category = self.get_category_by_id(id)
        category.descripcion = data.get('descripcion', category.descripcion)
        category.save()
        return category

    def destroy_category(self, id):        
        '''
        Elimina una categoría
        '''
        category = self.get_category_by_id(id)
        category.delete()
