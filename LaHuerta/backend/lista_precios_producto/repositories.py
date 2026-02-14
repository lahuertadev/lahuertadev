from .interfaces import IProductPriceListRepository
from .models import ListaPreciosProducto

class ProductPriceListRepository(IProductPriceListRepository):

    def get_all(self,
        price_list_id,
        product_id=None,
        category_id=None,
        container_type_id=None,
        description=None
    ):
        """
        Obtiene los productos asociados a una lista de precios específica,
        con filtros opcionales adicionales.
        """

        qs = (ListaPreciosProducto.objects.select_related(
                "producto__categoria",
                "producto__tipo_contenedor"
            ).filter(lista_precios_id=price_list_id)
        )

        if product_id is not None:
            qs = qs.filter(producto_id=product_id)

        if category_id is not None:
            qs = qs.filter(producto__categoria_id=category_id)

        if container_type_id is not None:
            qs = qs.filter(producto__tipo_contenedor_id=container_type_id)

        if description:
            qs = qs.filter(producto__descripcion__icontains=description)

        return qs

    def get_by_id(self, id):
        return ListaPreciosProducto.objects.filter(id=id).first()

    def create(self, data):
        item = ListaPreciosProducto(**data)
        item.save()
        return item

    def update(self, item, data):
        '''
        Utilizado tanto por el PUT como por el PATCH.
        '''
        if "lista_precios" in data:
            item.lista_precios = data["lista_precios"]
        if "producto" in data:
            item.producto = data["producto"]
        item.precio_unitario = data.get("precio_unitario", item.precio_unitario)
        item.precio_bulto = data.get("precio_bulto", item.precio_bulto)
        item.save()
        return item

    def destroy(self, item):
        item.delete()

    def verify_product_on_price_list(self, product_id):
        '''
        Verifica si existe un producto en la tabla
        '''
        return ListaPreciosProducto.objects.filter(producto_id=product_id)
