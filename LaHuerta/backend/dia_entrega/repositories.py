from .models import DiaEntrega
from .interfaces import IDeliveryDayRepository

class DeliveryDayRepository(IDeliveryDayRepository):
    
    def get_all_delivery_days(self):
        return DiaEntrega.objects.all()
