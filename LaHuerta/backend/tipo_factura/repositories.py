from .models import TipoFactura
from .interfaces import IBillTypeRepository

class BillTypeRepository(IBillTypeRepository):
    
    def get_all_bill_types(self):
        return TipoFactura.objects.all()