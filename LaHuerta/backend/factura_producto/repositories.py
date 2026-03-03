from .interfaces import IBillProductRepository
from .models import FacturaProducto


class BillProductRepository(IBillProductRepository):
    def verify_product_on_bill(self, product_id):
        '''
        Verifica si existe un producto en alguna factura
        '''
        return FacturaProducto.objects.filter(producto_id=product_id).exists()

    def create_products(self, bill, products):
        for product in products:
            FacturaProducto.objects.create(
                factura=bill,
                producto=product['producto'],
                cantidad=product['cantidad'],
                precio_unitario=product['precio_unitario'],
                precio_bulto=product['precio_bulto'],
                tipo_venta=product['tipo_venta'],
            )

    def replace_products(self, bill, products):

        FacturaProducto.objects.filter(factura=bill).delete()

        for product in products:
            FacturaProducto.objects.create(
                factura=bill,
                producto=product['producto'],
                cantidad=product['cantidad'],
                precio_unitario=product['precio_unitario'],
                precio_bulto=product['precio_bulto'],
                tipo_venta=product['tipo_venta'],
            )