from .models import ListaPrecios
from .interfaces import IPricesListRepository
from lista_precios_producto.models import ListaPreciosProducto
from core.text import capitalize_words
from cliente.models import Cliente

class PricesListRepository(IPricesListRepository):
    
    def get_all_prices_list(self, nombre=None):
        '''
        Obtiene todas las listas de precios con filtros opcionales.
        '''
        queryset = ListaPrecios.objects.all()
        
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
        
        return queryset

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

    def count_assigned_clients(self, prices_list):
        '''
        Cantidad de clientes que tienen asignada esta lista de precios.
        '''
        return Cliente.objects.filter(lista_precios=prices_list).count()

    def get_missing_client_ids(self, client_ids):
        '''
        Devuelve los ids de la lista que no corresponden a ningún cliente.
        '''
        existing_ids = set(Cliente.objects.filter(id__in=client_ids).values_list('id', flat=True))
        return sorted(set(client_ids) - existing_ids)

    def assign_to_clients(self, prices_list, client_ids):
        '''
        Asigna la lista de precios a todos los clientes indicados en un único UPDATE
        (si tenían otra lista, pasan a esta). Devuelve la cantidad de clientes actualizados.
        '''
        return Cliente.objects.filter(id__in=client_ids).update(lista_precios=prices_list)

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

        base_name = capitalize_words(f"Copia de {original_list.nombre}")
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
                tipo_venta=product.tipo_venta,
                precio=product.precio,
            )
        
        return new_list