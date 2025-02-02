from .interfaces import IBuyProductRepository
from .models import CompraProducto

class BuyProductRepository(IBuyProductRepository):
    def verify_product_on_buys(self, product_id):
        '''
        Verifica si existe el producto en alguna compra
        '''
        return CompraProducto.objects.filter(producto_id=product_id)