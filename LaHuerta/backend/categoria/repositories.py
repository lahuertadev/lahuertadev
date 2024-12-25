from .models import Categoria
from .interfaces import ICategoryRepository
from producto.repositories import ProductRepository
from .exceptions import (
    CategoryHasProductsException, 
    CategoryNotFoundException
)

class CategoryRepository(ICategoryRepository):
    
    def get_all_categories(self):
        '''
        Obtiene todos los tipos de categorías.
        '''
        return Categoria.objects.all()
    
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
        if not category:
            raise CategoryNotFoundException('Categoría no encontrada.')
        
        category.descripcion = data.get('descripcion', category.descripcion)
        category.save()

    def destroy_category(self, id):
        '''
        Elimina una categoría si no tiene asociado un producto
        '''
        product_repository = ProductRepository()
        exists = product_repository.verify_products_with_category_id(id)
        if exists:
            raise CategoryHasProductsException('No se puede eliminar la categoría, ya que tiene productos asociados.')
        try:
            category = Categoria.objects.get(id=id)
            category.delete()
        except Categoria.DoesNotExist:
            raise CategoryNotFoundException('Categoría no encontrada.')
