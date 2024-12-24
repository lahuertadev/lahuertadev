from .models import Producto
from .interfaces import IProductRepository

class ProductRepository(IProductRepository):
    
    def get_all_products(self, description=None, category=None, container_type=None ):
        products = Producto.objects.all()

        if description is not None:
            print('Entre en el if 1')
            products = products.filter(descripcion=description)
        if category is not None:
            print('Entre en el if 2')
            products = products.filter(categoria__descripcion=category)
        if container_type is not None:
            print('Entre en el if 3')
            products = products.filter(tipo_contenedor__descripcion=container_type)

        return products

