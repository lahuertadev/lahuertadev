from .models import ListaPrecios
from .interfaces import IPricesListRepository
from lista_precios_producto.models import ListaPreciosProducto

class PricesListRepository(IPricesListRepository):
    
    def get_all_prices_list(self):
        return ListaPrecios.objects.all()

    def get_prices_list_by_id(self, id):
        return ListaPrecios.objects.filter(id=id).first()

    def create_prices_list(self, data):
        prices_list = ListaPrecios(**data)
        prices_list.save()
        return prices_list

    def modify_prices_list(self, prices_list, data):

        # Integrity check --> name UNIQUE
        new_name = data.get("nombre", prices_list.nombre)
        if new_name != prices_list.nombre:
            if ListaPrecios.objects.filter(nombre=new_name).exclude(id=prices_list.id).exists():
                raise ValueError(f"Ya existe una lista de precios con el nombre '{new_name}'")
        
        prices_list.nombre = new_name
        prices_list.descripcion = data.get("descripcion", prices_list.descripcion)
        prices_list.save()
        return prices_list

    def destroy_prices_list(self, prices_list):
        prices_list.delete()

    def generate_unique_name(self, base_name):
        """
        Genera un nombre único para una lista de precios.
        Si el nombre ya existe, agrega un contador entre paréntesis.
        """
        new_name = base_name
        counter = 1
        
        while ListaPrecios.objects.filter(nombre=new_name).exists():
            new_name = f"{base_name} ({counter})"
            counter += 1
        
        return new_name

    def duplicate_prices_list(self, original_list):
        """
        Duplica una lista de precios con todos sus productos asociados.
        Genera automáticamente un nombre único agregando "Copia de" al nombre original.
        """

        base_name = f"Copia de {original_list.nombre}"
        new_name = self.generate_unique_name(base_name)

        new_list = ListaPrecios(
            nombre=new_name,
            descripcion=original_list.descripcion
        )
        new_list.save()
        
        original_products = ListaPreciosProducto.objects.filter(lista_precios=original_list)
        for product in original_products:
            ListaPreciosProducto.objects.create(
                lista_precios=new_list,
                producto=product.producto,
                precio_unitario=product.precio_unitario,
                precio_bulto=product.precio_bulto
            )
        
        return new_list