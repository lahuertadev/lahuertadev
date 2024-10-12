from .models import Pago
from .interfaces import IPaymentRepository

class PaymentRepository(IPaymentRepository):
    
    def get_all_payments(self):
        return Pago.objects.all()