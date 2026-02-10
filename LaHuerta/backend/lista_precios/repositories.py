from .models import ListaPrecios
from .interfaces import IPricesListRepository

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
        prices_list.nombre = data.get("nombre", prices_list.nombre)
        prices_list.descripcion = data.get("descripcion", prices_list.descripcion)
        prices_list.save()
        return prices_list

    def destroy_prices_list(self, prices_list):
        prices_list.delete()