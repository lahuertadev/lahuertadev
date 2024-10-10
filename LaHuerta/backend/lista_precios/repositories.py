from .models import ListaPrecios
from .interfaces import IPricesListRepository

class PricesListRepository(IPricesListRepository):
    
    def get_all_prices_list(self):
        return ListaPrecios.objects.all()