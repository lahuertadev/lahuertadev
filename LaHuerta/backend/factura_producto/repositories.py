from .interfaces import IBillProductRepository
from .models import FacturaProducto


class BillProductRepository(IBillProductRepository):
    def verify_product_on_bill(self, product_id):
        '''
        Verifica si existe un producto en alguna factura
        '''
        return FacturaProducto.objects.filter(producto_id=product_id).exists()