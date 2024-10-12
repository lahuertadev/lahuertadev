from .models import Factura
from .interfaces import IBillRepository

class BillRepository(IBillRepository):
    
    def get_all_bills(self):
        return Factura.objects.all()
    