from .models import Cheque
from .interfaces import ICheckRepository

class CheckRepository(ICheckRepository):
    
    def get_all_checks(self):
        return Cheque.objects.all()
    