from .models import Compra
from .interfaces import IBuyRepository

class BuyRepository(IBuyRepository):
    
    def get_all_buys(self):
        return Compra.objects.all()