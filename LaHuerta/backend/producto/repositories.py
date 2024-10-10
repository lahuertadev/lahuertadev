from .models import Producto
from .interfaces import IProductRepository

class ProductRepository(IProductRepository):
    
    def get_all_products(self):
        return Producto.objects.all()
    