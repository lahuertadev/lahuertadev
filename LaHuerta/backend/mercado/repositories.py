from .models import Mercado
from .interfaces import IMarketRepository

class MarketRepository(IMarketRepository):
    
    def get_all_markets(self):
        '''
        Obtiene todos los mercados.
        '''
        return Mercado.objects.all()