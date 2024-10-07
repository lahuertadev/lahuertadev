from .models import TipoPago
from .interfaces import IPaymentTypeRepository

class PaymentTypeRepository(IPaymentTypeRepository):
    
    def get_all_payment_types(self):
        '''
        Obtiene todos los tipos de unidad.
        '''
        return TipoPago.objects.all()