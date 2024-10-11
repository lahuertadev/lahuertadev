from .models import Proveedor
from .interfaces import ISupplierRepository

class SupplierRepository(ISupplierRepository):
    
    def get_all_suppliers(self):
        return Proveedor.objects.all()
    