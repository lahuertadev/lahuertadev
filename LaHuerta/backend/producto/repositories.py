from .models import Producto
from .interfaces import IProductRepository

class ProductRepository(IProductRepository):
    
    def get_all_products(self, description=None, category=None, container_type=None ):
        products = Producto.objects.all()

        if description is not None:
            products = products.filter(descripcion=description)
        if category is not None:
            products = products.filter(categoria__descripcion=category)
        if container_type is not None:
            products = products.filter(tipo_contenedor__descripcion=container_type)

        return products

    def verify_products_with_category_id(self, category_id):
        flag = Producto.objects.filter(categoria=category_id).exists()
        return flag
    
    def verify_products_with_container_type_id(self, container_id):

        exists = Producto.objects.filter(tipo_contenedor=container_id).exists()
        print('Este es el exists: ', exists)
        return exists
    
    def verify_products_with_unit_type_id(self, unit_id):
        exists = Producto.objects.filter(tipo_unidad=unit_id).exists()
        return exists