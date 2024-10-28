from .models import PagoFactura
from .interfaces import IBillPaymentRepository

class BillPaymentRepository(IBillPaymentRepository):
    
    def get_all_bill_payments(self):
        return PagoFactura.objects.all()