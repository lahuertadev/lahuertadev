from .interfaces import IBuyProductRepository
from .models import CompraProducto


class BuyProductRepository(IBuyProductRepository):

    def create_products(self, buy, products):
        for product in products:
            CompraProducto.objects.create(
                compra=buy,
                producto=product['producto'],
                tipo_venta=product.get('tipo_venta'),
                cantidad_producto=product['cantidad_producto'],
                precio_bulto=product['precio_bulto'],
                precio_unitario=product['precio_unitario'],
            )

    def replace_products(self, buy, products):
        CompraProducto.objects.filter(compra=buy).delete()

        for product in products:
            CompraProducto.objects.create(
                compra=buy,
                producto=product['producto'],
                tipo_venta=product.get('tipo_venta'),
                cantidad_producto=product['cantidad_producto'],
                precio_bulto=product['precio_bulto'],
                precio_unitario=product['precio_unitario'],
            )
