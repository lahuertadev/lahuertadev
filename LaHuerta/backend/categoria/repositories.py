from .models import Categoria
from .interfaces import ICategoryRepository

class CategoryRepository(ICategoryRepository):
    
    def get_all_categories(self):
        '''
        Obtiene todos los tipos de categorías.
        '''
        return Categoria.objects.all()