from .interfaces import IProductPriceListRepository
from .models import ListaPreciosProducto

class ProductPriceListRepository(IProductPriceListRepository):

    def verify_product_on_price_list(self, product_id):
        '''
        Verifica si existe un producto en la tabla
        '''
        return ListaPreciosProducto.objects.filter(producto_id=product_id)