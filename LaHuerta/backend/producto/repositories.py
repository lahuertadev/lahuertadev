from .models import Producto
from .interfaces import IProductRepository
from .exceptions import ProductNotFoundException

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
    
    def get_product_by_id(self, id):
        try:
            product = Producto.objects.get(id=id)
            return product
        except Producto.DoesNotExist:
            raise ProductNotFoundException(f'Producto con ID {id} no encontrado')

    def verify_products_with_category_id(self, category_id):
        flag = Producto.objects.filter(categoria=category_id).exists()
        return flag
    
    def verify_products_with_container_type_id(self, container_id):

        exists = Producto.objects.filter(tipo_contenedor=container_id).exists()
        return exists
    
    def verify_products_with_unit_type_id(self, unit_id):
        exists = Producto.objects.filter(tipo_unidad=unit_id).exists()
        return exists
    
    def create_product(self, data):
        product = Producto(**data)
        product.save()
        return product
    
    def update_product(self, product, validated_data):
        '''
        Actualiza un producto
        '''
        # Actualización de los campos
        for attr, value in validated_data.items():
            setattr(product, attr, value)

        # Guardado en la base de datos
        product.save()
        return product
    
    def delete_product(self, product):
        '''
        Elimina el producto
        '''
        product.delete()
